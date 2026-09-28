package com.studysync.service;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

/**
 * Service for converting Office documents (DOCX, PPTX) to PDF using
 * LibreOffice.
 * 
 * REQUIREMENT: LibreOffice must be installed on the system.
 * - macOS: brew install --cask libreoffice
 * - Windows: Download from https://www.libreoffice.org/download/
 * - Linux: sudo apt install libreoffice
 */
@Service
public class FileConversionService {

    private static final Logger log = LoggerFactory.getLogger(FileConversionService.class);
    private static final int CONVERSION_TIMEOUT_SECONDS = 60;

    /**
     * Converts a document (DOCX, PPTX, etc.) to PDF using LibreOffice headless
     * mode.
     * 
     * @param inputFile The input Office document
     * @return The converted PDF file, or null if conversion failed
     */
    public File convertToPdf(File inputFile) {
        if (inputFile == null || !inputFile.exists()) {
            log.error("Input file is null or does not exist");
            return null;
        }

        String sofficePath = findSofficePath();
        if (sofficePath == null) {
            log.error("LibreOffice not found. Please install LibreOffice:");
            log.error("  macOS: brew install --cask libreoffice");
            log.error("  Windows: Download from https://www.libreoffice.org/download/");
            log.error("  Linux: sudo apt install libreoffice");
            return null;
        }

        try {
            String outDir = inputFile.getParent();

            ProcessBuilder pb = new ProcessBuilder(
                    sofficePath,
                    "--headless",
                    "--invisible",
                    "--nologo",
                    "--nofirststartwizard",
                    "--convert-to", "pdf",
                    "--outdir", outDir,
                    inputFile.getAbsolutePath());

            pb.redirectErrorStream(true);

            log.info("Converting {} to PDF using LibreOffice...", inputFile.getName());
            Process process = pb.start();

            // Capture output for debugging
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean completed = process.waitFor(CONVERSION_TIMEOUT_SECONDS, TimeUnit.SECONDS);

            if (!completed) {
                process.destroyForcibly();
                log.error("LibreOffice conversion timed out after {} seconds", CONVERSION_TIMEOUT_SECONDS);
                return null;
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                log.error("LibreOffice conversion failed with exit code {}: {}", exitCode, output);
                return null;
            }

            // Construct expected PDF filename
            String fileName = inputFile.getName();
            String baseName = fileName.substring(0, fileName.lastIndexOf('.'));
            File pdfFile = new File(outDir, baseName + ".pdf");

            if (pdfFile.exists()) {
                log.info("Successfully converted to PDF: {} ({} bytes)", pdfFile.getName(), pdfFile.length());
                return pdfFile;
            } else {
                log.error("PDF file not found after conversion. Expected: {}", pdfFile.getAbsolutePath());
                log.error("LibreOffice output: {}", output);
                return null;
            }

        } catch (Exception e) {
            log.error("Error during PDF conversion: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Finds the LibreOffice soffice executable path based on the operating system.
     * 
     * @return Path to soffice executable, or null if not found
     */
    private String findSofficePath() {
        String os = System.getProperty("os.name").toLowerCase();
        String[] possiblePaths;

        if (os.contains("mac")) {
            possiblePaths = new String[] {
                    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
                    "/opt/homebrew/bin/soffice",
                    "/usr/local/bin/soffice"
            };
        } else if (os.contains("win")) {
            possiblePaths = new String[] {
                    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
                    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
                    System.getenv("LOCALAPPDATA") + "\\Programs\\LibreOffice\\program\\soffice.exe"
            };
        } else {
            // Linux and other Unix-like systems
            possiblePaths = new String[] {
                    "/usr/bin/soffice",
                    "/usr/bin/libreoffice",
                    "/usr/local/bin/soffice",
                    "/snap/bin/libreoffice"
            };
        }

        for (String path : possiblePaths) {
            if (path != null) {
                File file = new File(path);
                if (file.exists() && file.canExecute()) {
                    log.debug("Found LibreOffice at: {}", path);
                    return path;
                }
            }
        }

        // Try to find via PATH
        try {
            String command = os.contains("win") ? "where soffice" : "which soffice";
            Process process = Runtime.getRuntime().exec(command);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String path = reader.readLine();
                if (path != null && !path.isEmpty()) {
                    File file = new File(path.trim());
                    if (file.exists()) {
                        log.debug("Found LibreOffice via PATH: {}", path);
                        return path.trim();
                    }
                }
            }
        } catch (Exception ignored) {
            // PATH lookup failed, continue
        }

        log.warn("LibreOffice not found in any standard location");
        return null;
    }

    /**
     * Checks if LibreOffice is available on this system.
     * 
     * @return true if LibreOffice is installed and accessible
     */
    public boolean isLibreOfficeAvailable() {
        return findSofficePath() != null;
    }
}
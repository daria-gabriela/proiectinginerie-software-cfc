package com.studysync.service;

import com.studysync.dto.LoginRequestDTO;
import com.studysync.dto.RegisterRequestDTO;
import com.studysync.model.User;
import com.studysync.model.UserRole;
import com.studysync.repository.UserRepository;
import com.studysync.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Teste unitare pentru AuthenticationService
 * 
 * Aceste teste verifică:
 * - Înregistrarea utilizatorilor noi
 * - Autentificarea utilizatorilor existenți
 * - Validarea emailurilor duplicate
 * - Gestionarea credențialelor invalide
 */
@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private JwtUtils jwtUtils;
    
    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthenticationService authenticationService;

    private RegisterRequestDTO validRegisterRequest;
    private LoginRequestDTO validLoginRequest;
    private User testUser;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequestDTO();
        validRegisterRequest.setEmail("test@student.com");
        validRegisterRequest.setPassword("securePassword123");
        validRegisterRequest.setFirstName("Andrei");
        validRegisterRequest.setLastName("Popescu");

        validLoginRequest = new LoginRequestDTO();
        validLoginRequest.setEmail("test@student.com");
        validLoginRequest.setPassword("securePassword123");

        testUser = User.builder()
                .id("user123")
                .email("test@student.com")
                .password("encodedPassword")
                .firstName("Andrei")
                .lastName("Popescu")
                .role(UserRole.STUDENT)
                .build();
    }

    // ============================================
    // Teste pentru Register
    // ============================================

    @Test
    void register_Success_ShouldReturnJwtToken() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtUtils.generateToken(any(User.class))).thenReturn("jwt.token.here");

        // Act
        String token = authenticationService.register(validRegisterRequest);

        // Assert
        assertNotNull(token);
        assertEquals("jwt.token.here", token);
        verify(userRepository).existsByEmail("test@student.com");
        verify(userRepository).save(any(User.class));
        verify(jwtUtils).generateToken(any(User.class));
    }

    @Test
    void register_DuplicateEmail_ShouldThrowException() {
        // Arrange
        when(userRepository.existsByEmail("test@student.com")).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authenticationService.register(validRegisterRequest)
        );

        assertEquals("Email already registered", exception.getMessage());
        verify(userRepository).existsByEmail("test@student.com");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_ShouldEncodePassword() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode("securePassword123")).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtUtils.generateToken(any(User.class))).thenReturn("token");

        // Act
        authenticationService.register(validRegisterRequest);

        // Assert
        verify(passwordEncoder).encode("securePassword123");
        verify(userRepository).save(argThat(user -> 
            user.getPassword().equals("hashedPassword")
        ));
    }

    @Test
    void register_ShouldSetStudentRole() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtUtils.generateToken(any(User.class))).thenReturn("token");

        // Act
        authenticationService.register(validRegisterRequest);

        // Assert
        verify(userRepository).save(argThat(user -> 
            user.getRole() == UserRole.STUDENT
        ));
    }

    // ============================================
    // Teste pentru Login
    // ============================================

    @Test
    void login_Success_ShouldReturnJwtToken() {
        // Arrange
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken(testUser, null));
        when(userRepository.findByEmail("test@student.com")).thenReturn(Optional.of(testUser));
        when(jwtUtils.generateToken(testUser)).thenReturn("jwt.token.here");

        // Act
        String token = authenticationService.login(validLoginRequest);

        // Assert
        assertNotNull(token);
        assertEquals("jwt.token.here", token);
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository).findByEmail("test@student.com");
    }

    @Test
    void login_InvalidCredentials_ShouldThrowException() {
        // Arrange
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // Act & Assert
        assertThrows(
                BadCredentialsException.class,
                () -> authenticationService.login(validLoginRequest)
        );

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void login_UserNotFound_ShouldThrowException() {
        // Arrange
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken(testUser, null));
        when(userRepository.findByEmail("test@student.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(
                java.util.NoSuchElementException.class,
                () -> authenticationService.login(validLoginRequest)
        );
    }
}

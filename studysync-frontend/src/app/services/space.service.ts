import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface StudySpace {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  ownerUserId: string;
  members: SpaceMember[];
}

export interface SpaceMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface CreateSpaceDTO {
  name: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class SpaceService {
  constructor(private http: HttpClient) {}
  
  getMySpaces(): Promise<StudySpace[]> {
    return firstValueFrom(this.http.get<StudySpace[]>('/api/spaces'));
  }
  
  getSpaceById(id: string): Promise<StudySpace> {
    return firstValueFrom(this.http.get<StudySpace>(`/api/spaces/${id}`));
  }
  
  createSpace(dto: CreateSpaceDTO): Promise<StudySpace> {
    return firstValueFrom(this.http.post<StudySpace>('/api/spaces', dto));
  }
  
  joinSpace(inviteCode: string): Promise<StudySpace> {
    return firstValueFrom(this.http.post<StudySpace>('/api/spaces/join', { inviteCode }));
  }
  
  leaveSpace(spaceId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`/api/spaces/${spaceId}/leave`, {}));
  }
}

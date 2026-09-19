import { Request } from 'express';

export type Role = 'Owner' | 'Admin' | 'Member';
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends UserDto {
  password: string;
}

export interface PasswordResetOTPDto {
  id: string;
  email: string;
  hashedOtp: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  progress: number;
  dueDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: Partial<UserDto>;
  tasksCount?: number;
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  projectId: string | null;
  assignedTo: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  project?: Partial<ProjectDto> | null;
  assignee?: Partial<UserDto> | null;
  creator?: Partial<UserDto> | null;
}

export interface ChannelDto {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  membersCount?: number;
}

export interface ChannelMemberDto {
  id: string;
  channelId: string;
  userId: string;
  joinedAt: Date;
  user?: Partial<UserDto>;
}

export interface MessageDto {
  id: string;
  channelId: string;
  userId: string;
  message: string;
  createdAt: Date;
  user?: Partial<UserDto>;
}

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

export interface ActivityDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  userId: string;
  projectId: string | null;
  createdAt: Date;
  user?: Partial<UserDto>;
  project?: Partial<ProjectDto> | null;
}

export interface AuthRequest extends Request {
  user?: UserDto;
}

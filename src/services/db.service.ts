import crypto from 'crypto';
import { getPrisma } from '../config/prisma.js';
import {
  UserDto,
  UserWithPassword,
  ProjectDto,
  TaskDto,
  ChannelDto,
  ChannelMemberDto,
  MessageDto,
  NotificationDto,
  ActivityDto,
  PasswordResetOTPDto,
  Role,
  ProjectStatus,
  Priority,
  TaskStatus,
} from '../models/types.js';

// In-Memory Database Store as fallback & local runtime storage
class MemoryStore {
  users: Map<string, UserWithPassword> = new Map();
  projects: Map<string, ProjectDto> = new Map();
  tasks: Map<string, TaskDto> = new Map();
  channels: Map<string, ChannelDto> = new Map();
  channelMembers: Map<string, ChannelMemberDto> = new Map();
  messages: Map<string, MessageDto> = new Map();
  notifications: Map<string, NotificationDto> = new Map();
  activities: Map<string, ActivityDto> = new Map();
  otps: Map<string, PasswordResetOTPDto> = new Map();

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    // Seed default "General" channel
    const generalChannelId = 'general-channel-id';
    if (!this.channels.has(generalChannelId)) {
      this.channels.set(generalChannelId, {
        id: generalChannelId,
        name: 'General',
        description: 'Default organization channel for all team members',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

const memDb = new MemoryStore();

export class DbService {
  // Ensure default General channel exists
  static async ensureDefaultChannel(): Promise<ChannelDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        let general = await prisma.channel.findFirst({
          where: { isDefault: true },
        });
        if (!general) {
          general = await prisma.channel.create({
            data: {
              name: 'General',
              description: 'Default organization channel for all team members',
              isDefault: true,
            },
          });
        }
        return general as ChannelDto;
      } catch (err) {
        // fallback to memory
      }
    }

    let general = Array.from(memDb.channels.values()).find((c) => c.isDefault);
    if (!general) {
      general = {
        id: crypto.randomUUID(),
        name: 'General',
        description: 'Default organization channel for all team members',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memDb.channels.set(general.id, general);
    }
    return general;
  }

  // USER METHODS
  static async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        return user as UserWithPassword | null;
      } catch (err) {
        // fallback
      }
    }

    for (const u of memDb.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return u;
      }
    }
    return null;
  }

  static async findUserById(id: string): Promise<UserDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
        });
        if (!user) return null;
        const { password, ...rest } = user;
        return rest as UserDto;
      } catch (err) {
        // fallback
      }
    }

    const u = memDb.users.get(id);
    if (!u) return null;
    const { password, ...rest } = u;
    return rest as UserDto;
  }

  static async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    avatar?: string | null;
  }): Promise<UserDto> {
    const prisma = getPrisma();
    const role = data.role || 'Member';
    const email = data.email.toLowerCase();

    if (prisma) {
      try {
        const created = await prisma.user.create({
          data: {
            name: data.name,
            email,
            password: data.password,
            role,
            avatar: data.avatar || null,
          },
        });
        const { password, ...rest } = created;
        return rest as UserDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const user: UserWithPassword = {
      id,
      name: data.name,
      email,
      password: data.password,
      avatar: data.avatar || null,
      role,
      createdAt: now,
      updatedAt: now,
    };
    memDb.users.set(id, user);
    const { password, ...rest } = user;
    return rest as UserDto;
  }

  static async updateUser(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      password: string;
      avatar: string | null;
      role: Role;
    }>
  ): Promise<UserDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            ...data,
            email: data.email ? data.email.toLowerCase() : undefined,
          },
        });
        const { password, ...rest } = updated;
        return rest as UserDto;
      } catch (err) {
        // fallback
      }
    }

    const user = memDb.users.get(id);
    if (!user) return null;

    const updatedUser: UserWithPassword = {
      ...user,
      ...data,
      email: data.email ? data.email.toLowerCase() : user.email,
      updatedAt: new Date(),
    };
    memDb.users.set(id, updatedUser);
    const { password, ...rest } = updatedUser;
    return rest as UserDto;
  }

  static async getAllUsers(): Promise<UserDto[]> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
        });
        return users.map(({ password, ...rest }) => rest as UserDto);
      } catch (err) {
        // fallback
      }
    }

    return Array.from(memDb.users.values()).map(({ password, ...rest }) => rest as UserDto);
  }

  static async deleteUser(id: string): Promise<boolean> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.user.delete({ where: { id } });
        return true;
      } catch (err) {
        // fallback
      }
    }
    return memDb.users.delete(id);
  }

  // OTP METHODS
  static async createOtp(email: string, hashedOtp: string, expiresAt: Date): Promise<PasswordResetOTPDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const created = await prisma.passwordResetOTP.create({
          data: {
            email: email.toLowerCase(),
            hashedOtp,
            expiresAt,
            used: false,
          },
        });
        return created as PasswordResetOTPDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const record: PasswordResetOTPDto = {
      id,
      email: email.toLowerCase(),
      hashedOtp,
      expiresAt,
      used: false,
      createdAt: new Date(),
    };
    memDb.otps.set(id, record);
    return record;
  }

  static async findValidOtp(email: string): Promise<PasswordResetOTPDto | null> {
    const now = new Date();
    const prisma = getPrisma();
    if (prisma) {
      try {
        const otp = await prisma.passwordResetOTP.findFirst({
          where: {
            email: email.toLowerCase(),
            used: false,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
        });
        return otp as PasswordResetOTPDto | null;
      } catch (err) {
        // fallback
      }
    }

    const candidates = Array.from(memDb.otps.values())
      .filter((o) => o.email.toLowerCase() === email.toLowerCase() && !o.used && o.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return candidates[0] || null;
  }

  static async invalidateOtp(id: string): Promise<void> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.passwordResetOTP.update({
          where: { id },
          data: { used: true },
        });
        return;
      } catch (err) {
        // fallback
      }
    }

    const record = memDb.otps.get(id);
    if (record) {
      record.used = true;
      memDb.otps.set(id, record);
    }
  }

  // PROJECT METHODS
  static async createProject(data: {
    name: string;
    description?: string | null;
    status?: ProjectStatus;
    priority?: Priority;
    progress?: number;
    dueDate?: Date | null;
    createdBy: string;
  }): Promise<ProjectDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const project = await prisma.project.create({
          data: {
            name: data.name,
            description: data.description || null,
            status: data.status || 'PLANNING',
            priority: data.priority || 'MEDIUM',
            progress: data.progress ?? 0,
            dueDate: data.dueDate || null,
            createdBy: data.createdBy,
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        });
        return project as ProjectDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const creator = await this.findUserById(data.createdBy);
    const project: ProjectDto = {
      id,
      name: data.name,
      description: data.description || null,
      status: data.status || 'PLANNING',
      priority: data.priority || 'MEDIUM',
      progress: data.progress ?? 0,
      dueDate: data.dueDate || null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
      creator: creator || undefined,
    };
    memDb.projects.set(id, project);
    return project;
  }

  static async getProjects(filters?: {
    status?: ProjectStatus;
    priority?: Priority;
    search?: string;
  }): Promise<ProjectDto[]> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.priority) where.priority = filters.priority;
        if (filters?.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        const projects = await prisma.project.findMany({
          where,
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
            _count: {
              select: { tasks: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return projects.map((p) => ({
          ...p,
          tasksCount: (p as any)._count?.tasks ?? 0,
        })) as ProjectDto[];
      } catch (err) {
        // fallback
      }
    }

    let list = Array.from(memDb.projects.values());
    if (filters?.status) {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters?.priority) {
      list = list.filter((p) => p.priority === filters.priority);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s))
      );
    }

    return list.map((p) => {
      const taskCount = Array.from(memDb.tasks.values()).filter((t) => t.projectId === p.id).length;
      return { ...p, tasksCount: taskCount };
    });
  }

  static async getProjectById(id: string): Promise<ProjectDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const project = await prisma.project.findUnique({
          where: { id },
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
            tasks: {
              include: {
                assignee: {
                  select: { id: true, name: true, email: true, avatar: true },
                },
              },
            },
          },
        });
        return project as ProjectDto | null;
      } catch (err) {
        // fallback
      }
    }

    const project = memDb.projects.get(id);
    if (!project) return null;
    return project;
  }

  static async updateProject(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      status: ProjectStatus;
      priority: Priority;
      progress: number;
      dueDate: Date | null;
    }>
  ): Promise<ProjectDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const project = await prisma.project.update({
          where: { id },
          data,
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        });
        return project as ProjectDto;
      } catch (err) {
        // fallback
      }
    }

    const project = memDb.projects.get(id);
    if (!project) return null;
    const updated: ProjectDto = {
      ...project,
      ...data,
      updatedAt: new Date(),
    };
    memDb.projects.set(id, updated);
    return updated;
  }

  static async deleteProject(id: string): Promise<boolean> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.project.delete({ where: { id } });
        return true;
      } catch (err) {
        // fallback
      }
    }
    return memDb.projects.delete(id);
  }

  // TASK METHODS
  static async createTask(data: {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: Date | null;
    projectId?: string | null;
    assignedTo?: string | null;
    createdBy: string;
  }): Promise<TaskDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const task = await prisma.task.create({
          data: {
            title: data.title,
            description: data.description || null,
            status: data.status || 'TODO',
            priority: data.priority || 'MEDIUM',
            dueDate: data.dueDate || null,
            projectId: data.projectId || null,
            assignedTo: data.assignedTo || null,
            createdBy: data.createdBy,
          },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            project: { select: { id: true, name: true } },
          },
        });
        return task as TaskDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const creator = await this.findUserById(data.createdBy);
    const assignee = data.assignedTo ? await this.findUserById(data.assignedTo) : null;
    const project = data.projectId ? await this.getProjectById(data.projectId) : null;

    const task: TaskDto = {
      id,
      title: data.title,
      description: data.description || null,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      dueDate: data.dueDate || null,
      projectId: data.projectId || null,
      assignedTo: data.assignedTo || null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
      creator: creator || undefined,
      assignee: assignee || undefined,
      project: project || undefined,
    };
    memDb.tasks.set(id, task);
    return task;
  }

  static async getTasks(filters?: {
    status?: TaskStatus;
    priority?: Priority;
    projectId?: string;
    assignedTo?: string;
    createdBy?: string;
    search?: string;
    dueDate?: Date;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TaskDto[]> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.priority) where.priority = filters.priority;
        if (filters?.projectId) where.projectId = filters.projectId;
        if (filters?.assignedTo) where.assignedTo = filters.assignedTo;
        if (filters?.createdBy) where.createdBy = filters.createdBy;

        if (filters?.search) {
          where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters?.startDate && filters?.endDate) {
          where.dueDate = {
            gte: filters.startDate,
            lte: filters.endDate,
          };
        } else if (filters?.dueDate) {
          const start = new Date(filters.dueDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.dueDate);
          end.setHours(23, 59, 59, 999);
          where.dueDate = {
            gte: start,
            lte: end,
          };
        }

        const tasks = await prisma.task.findMany({
          where,
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        return tasks as TaskDto[];
      } catch (err) {
        // fallback
      }
    }

    let list = Array.from(memDb.tasks.values());
    if (filters?.status) list = list.filter((t) => t.status === filters.status);
    if (filters?.priority) list = list.filter((t) => t.priority === filters.priority);
    if (filters?.projectId) list = list.filter((t) => t.projectId === filters.projectId);
    if (filters?.assignedTo) list = list.filter((t) => t.assignedTo === filters.assignedTo);
    if (filters?.createdBy) list = list.filter((t) => t.createdBy === filters.createdBy);

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(s) || (t.description && t.description.toLowerCase().includes(s))
      );
    }

    if (filters?.startDate && filters?.endDate) {
      list = list.filter((t) => t.dueDate && t.dueDate >= filters.startDate! && t.dueDate <= filters.endDate!);
    } else if (filters?.dueDate) {
      const targetDate = new Date(filters.dueDate).toISOString().split('T')[0];
      list = list.filter((t) => t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] === targetDate);
    }

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static async getTaskById(id: string): Promise<TaskDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const task = await prisma.task.findUnique({
          where: { id },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            project: { select: { id: true, name: true } },
          },
        });
        return task as TaskDto | null;
      } catch (err) {
        // fallback
      }
    }

    const task = memDb.tasks.get(id);
    return task || null;
  }

  static async updateTask(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: Priority;
      dueDate: Date | null;
      projectId: string | null;
      assignedTo: string | null;
    }>
  ): Promise<TaskDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const task = await prisma.task.update({
          where: { id },
          data,
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            project: { select: { id: true, name: true } },
          },
        });
        return task as TaskDto;
      } catch (err) {
        // fallback
      }
    }

    const task = memDb.tasks.get(id);
    if (!task) return null;

    const assignee = data.assignedTo !== undefined
      ? (data.assignedTo ? await this.findUserById(data.assignedTo) : null)
      : task.assignee;

    const project = data.projectId !== undefined
      ? (data.projectId ? await this.getProjectById(data.projectId) : null)
      : task.project;

    const updated: TaskDto = {
      ...task,
      ...data,
      assignee: assignee || undefined,
      project: project || undefined,
      updatedAt: new Date(),
    };
    memDb.tasks.set(id, updated);
    return updated;
  }

  static async deleteTask(id: string): Promise<boolean> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.task.delete({ where: { id } });
        return true;
      } catch (err) {
        // fallback
      }
    }
    return memDb.tasks.delete(id);
  }

  // CHANNEL METHODS
  static async createChannel(data: { name: string; description?: string | null }): Promise<ChannelDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const channel = await prisma.channel.create({
          data: {
            name: data.name,
            description: data.description || null,
            isDefault: false,
          },
        });
        return channel as ChannelDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const channel: ChannelDto = {
      id,
      name: data.name,
      description: data.description || null,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };
    memDb.channels.set(id, channel);
    return channel;
  }

  static async getChannels(): Promise<ChannelDto[]> {
    await this.ensureDefaultChannel();
    const prisma = getPrisma();
    if (prisma) {
      try {
        const channels = await prisma.channel.findMany({
          include: {
            _count: {
              select: { members: true },
            },
          },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });
        return channels.map((c) => ({
          ...c,
          membersCount: (c as any)._count?.members ?? 0,
        })) as ChannelDto[];
      } catch (err) {
        // fallback
      }
    }

    return Array.from(memDb.channels.values()).map((c) => {
      const count = Array.from(memDb.channelMembers.values()).filter((m) => m.channelId === c.id).length;
      return { ...c, membersCount: count };
    });
  }

  static async getChannelById(id: string): Promise<ChannelDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const channel = await prisma.channel.findUnique({
          where: { id },
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
              },
            },
          },
        });
        return channel as ChannelDto | null;
      } catch (err) {
        // fallback
      }
    }

    const channel = memDb.channels.get(id);
    return channel || null;
  }

  static async addChannelMember(channelId: string, userId: string): Promise<ChannelMemberDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const member = await prisma.channelMember.upsert({
          where: {
            channelId_userId: { channelId, userId },
          },
          update: {},
          create: { channelId, userId },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
          },
        });
        return member as ChannelMemberDto;
      } catch (err) {
        // fallback
      }
    }

    const key = `${channelId}:${userId}`;
    let member = memDb.channelMembers.get(key);
    if (!member) {
      const user = await this.findUserById(userId);
      member = {
        id: crypto.randomUUID(),
        channelId,
        userId,
        joinedAt: new Date(),
        user: user || undefined,
      };
      memDb.channelMembers.set(key, member);
    }
    return member;
  }

  static async removeChannelMember(channelId: string, userId: string): Promise<boolean> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.channelMember.delete({
          where: {
            channelId_userId: { channelId, userId },
          },
        });
        return true;
      } catch (err) {
        // fallback
      }
    }

    const key = `${channelId}:${userId}`;
    return memDb.channelMembers.delete(key);
  }

  // MESSAGE METHODS
  static async createMessage(data: {
    channelId: string;
    userId: string;
    message: string;
  }): Promise<MessageDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const message = await prisma.message.create({
          data: {
            channelId: data.channelId,
            userId: data.userId,
            message: data.message,
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
          },
        });
        return message as MessageDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const user = await this.findUserById(data.userId);
    const msg: MessageDto = {
      id,
      channelId: data.channelId,
      userId: data.userId,
      message: data.message,
      createdAt: now,
      user: user || undefined,
    };
    memDb.messages.set(id, msg);
    return msg;
  }

  static async getChannelMessages(channelId: string, limit: number = 100): Promise<MessageDto[]> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const messages = await prisma.message.findMany({
          where: { channelId },
          take: limit,
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
          },
        });
        return messages as MessageDto[];
      } catch (err) {
        // fallback
      }
    }

    return Array.from(memDb.messages.values())
      .filter((m) => m.channelId === channelId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit);
  }

  static async getMessageById(id: string): Promise<MessageDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const message = await prisma.message.findUnique({
          where: { id },
        });
        return message as MessageDto | null;
      } catch (err) {
        // fallback
      }
    }

    return memDb.messages.get(id) || null;
  }

  static async deleteMessage(id: string): Promise<boolean> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.message.delete({ where: { id } });
        return true;
      } catch (err) {
        // fallback
      }
    }
    return memDb.messages.delete(id);
  }

  // NOTIFICATION METHODS
  static async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
  }): Promise<NotificationDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const notif = await prisma.notification.create({
          data: {
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type || 'info',
            read: false,
          },
        });
        return notif as NotificationDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const notif: NotificationDto = {
      id,
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      read: false,
      createdAt: new Date(),
    };
    memDb.notifications.set(id, notif);
    return notif;
  }

  static async getUserNotifications(userId: string): Promise<NotificationDto[]> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const notifs = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        return notifs as NotificationDto[];
      } catch (err) {
        // fallback
      }
    }

    return Array.from(memDb.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static async markNotificationAsRead(id: string, userId: string): Promise<NotificationDto | null> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const notif = await prisma.notification.update({
          where: { id },
          data: { read: true },
        });
        return notif as NotificationDto;
      } catch (err) {
        // fallback
      }
    }

    const notif = memDb.notifications.get(id);
    if (!notif || notif.userId !== userId) return null;
    notif.read = true;
    memDb.notifications.set(id, notif);
    return notif;
  }

  static async markAllNotificationsAsRead(userId: string): Promise<number> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const res = await prisma.notification.updateMany({
          where: { userId, read: false },
          data: { read: true },
        });
        return res.count;
      } catch (err) {
        // fallback
      }
    }

    let count = 0;
    for (const notif of memDb.notifications.values()) {
      if (notif.userId === userId && !notif.read) {
        notif.read = true;
        count++;
      }
    }
    return count;
  }

  static async deleteNotification(id: string, userId: string): Promise<boolean> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.notification.delete({
          where: { id },
        });
        return true;
      } catch (err) {
        // fallback
      }
    }

    const notif = memDb.notifications.get(id);
    if (!notif || notif.userId !== userId) return false;
    return memDb.notifications.delete(id);
  }

  // ACTIVITY METHODS
  static async recordActivity(data: {
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: string | null;
    userId: string;
    projectId?: string | null;
  }): Promise<ActivityDto> {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const act = await prisma.activity.create({
          data: {
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId || null,
            details: data.details || null,
            userId: data.userId,
            projectId: data.projectId || null,
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
            project: { select: { id: true, name: true } },
          },
        });
        return act as ActivityDto;
      } catch (err) {
        // fallback
      }
    }

    const id = crypto.randomUUID();
    const user = await this.findUserById(data.userId);
    const project = data.projectId ? await this.getProjectById(data.projectId) : null;

    const activity: ActivityDto = {
      id,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      details: data.details || null,
      userId: data.userId,
      projectId: data.projectId || null,
      createdAt: new Date(),
      user: user || undefined,
      project: project || undefined,
    };
    memDb.activities.set(id, activity);
    return activity;
  }

  static async getActivities(filters?: {
    projectId?: string;
    userId?: string;
    entityType?: string;
    limit?: number;
  }): Promise<ActivityDto[]> {
    const prisma = getPrisma();
    const limit = filters?.limit || 50;

    if (prisma) {
      try {
        const where: any = {};
        if (filters?.projectId) where.projectId = filters.projectId;
        if (filters?.userId) where.userId = filters.userId;
        if (filters?.entityType) where.entityType = filters.entityType;

        const activities = await prisma.activity.findMany({
          where,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
            project: { select: { id: true, name: true } },
          },
        });
        return activities as ActivityDto[];
      } catch (err) {
        // fallback
      }
    }

    let list = Array.from(memDb.activities.values());
    if (filters?.projectId) list = list.filter((a) => a.projectId === filters.projectId);
    if (filters?.userId) list = list.filter((a) => a.userId === filters.userId);
    if (filters?.entityType) list = list.filter((a) => a.entityType === filters.entityType);

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }
}

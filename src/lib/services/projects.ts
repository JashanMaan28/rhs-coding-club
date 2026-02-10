import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project } from '@/lib/firebase-collections';

export interface ProjectWithAuthor extends Project {
  authorName: string;
  authorEmail: string;
}

export interface CreateProjectData {
  title: string;
  description: string;
  tech: string[];
  repoUrl?: string;
  demoUrl?: string;
  images?: string[];
  year?: number;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

export interface ProjectFilters {
  tags?: string[];
  year?: number;
  approved?: boolean;
  featured?: boolean;
  authorId?: string;
}

export class ProjectService {
  private projectsCollection = collection(db, 'projects');
  private usersCollection = collection(db, 'users');

  // Create a new project submission
  async createProject(projectData: CreateProjectData, authorId: string): Promise<string> {
    const project: Omit<Project, 'id'> = {
      ...projectData,
      authorId,
      approved: false, // All submissions start as unapproved
      featured: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(this.projectsCollection, project);
    return docRef.id;
  }

  // Get all projects with optional filters
  async getProjects(filters: ProjectFilters = {}): Promise<ProjectWithAuthor[]> {
    let q = query(this.projectsCollection);

    // Apply filters
    if (filters.approved !== undefined) {
      q = query(q, where('approved', '==', filters.approved));
    }
    
    if (filters.featured !== undefined) {
      q = query(q, where('featured', '==', filters.featured));
    }

    if (filters.authorId) {
      q = query(q, where('authorId', '==', filters.authorId));
    }

    if (filters.year) {
      q = query(q, where('year', '==', filters.year));
    }

    // Order by featured first, then by creation date
    q = query(q, orderBy('featured', 'desc'), orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Batch-fetch unique authors instead of N+1 queries
    const uniqueAuthorIds = [...new Set(projects.map(p => p.authorId))];
    const authorDocs = await Promise.all(
      uniqueAuthorIds.map(id => getDoc(doc(this.usersCollection, id)))
    );
    const authorMap = new Map<string, { displayName?: string; name?: string; email?: string }>();
    for (const authorDoc of authorDocs) {
      if (authorDoc.exists()) {
        authorMap.set(authorDoc.id, authorDoc.data() as { displayName?: string; name?: string; email?: string });
      }
    }

    const projectsWithAuthors = projects.map(project => {
      const authorData = authorMap.get(project.authorId);
      return {
        ...project,
        authorName: authorData?.displayName || authorData?.name || 'Unknown',
        authorEmail: authorData?.email || '',
      } as ProjectWithAuthor;
    });

    // Apply tag filters in memory (since Firestore doesn't support array-contains-any with other filters)
    if (filters.tags && filters.tags.length > 0) {
      return projectsWithAuthors.filter(project => 
        filters.tags!.some(tag => project.tech.includes(tag))
      );
    }

    return projectsWithAuthors;
  }

  // Get a single project by ID
  async getProject(id: string): Promise<ProjectWithAuthor | null> {
    const docSnap = await getDoc(doc(this.projectsCollection, id));
    
    if (!docSnap.exists()) {
      return null;
    }

    const project = { id: docSnap.id, ...docSnap.data() } as Project;
    
    // Get author information
    const authorDoc = await getDoc(doc(this.usersCollection, project.authorId));
    const authorData = authorDoc.data();

    return {
      ...project,
      authorName: authorData?.displayName || authorData?.name || 'Unknown',
      authorEmail: authorData?.email || '',
    } as ProjectWithAuthor;
  }

  // Update project (admin only)
  async updateProject(projectData: UpdateProjectData): Promise<void> {
    const { id, ...updateData } = projectData;
    const projectRef = doc(this.projectsCollection, id);
    
    await updateDoc(projectRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });
  }

  // Approve project (admin only)
  async approveProject(id: string): Promise<void> {
    const projectRef = doc(this.projectsCollection, id);
    await updateDoc(projectRef, {
      approved: true,
      updatedAt: Timestamp.now(),
    });
  }

  // Feature/unfeature project (admin only)
  async toggleFeatureProject(id: string, featured: boolean): Promise<void> {
    const projectRef = doc(this.projectsCollection, id);
    await updateDoc(projectRef, {
      featured,
      updatedAt: Timestamp.now(),
    });
  }

  // Delete project (admin only)
  async deleteProject(id: string): Promise<void> {
    const projectRef = doc(this.projectsCollection, id);
    await deleteDoc(projectRef);
  }

  // Get all unique technologies from approved projects
  async getTechnologies(): Promise<string[]> {
    const projects = await this.getProjects({ approved: true });
    const techSet = new Set<string>();
    
    projects.forEach(project => {
      project.tech.forEach(tech => techSet.add(tech));
    });

    return Array.from(techSet).sort();
  }

  // Get all unique years from approved projects
  async getYears(): Promise<number[]> {
    const projects = await this.getProjects({ approved: true });
    const yearSet = new Set<number>();
    
    projects.forEach(project => {
      if (project.year) {
        yearSet.add(project.year);
      }
    });

    return Array.from(yearSet).sort((a, b) => b - a); // Most recent first
  }

  // Get pending projects for admin review
  async getPendingProjects(): Promise<ProjectWithAuthor[]> {
    return this.getProjects({ approved: false });
  }

  // Get featured projects
  async getFeaturedProjects(): Promise<ProjectWithAuthor[]> {
    return this.getProjects({ approved: true, featured: true });
  }
}

export const projectService = new ProjectService();

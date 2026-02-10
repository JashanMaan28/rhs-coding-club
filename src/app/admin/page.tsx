'use client';

import { useState, useEffect } from 'react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth, UserRole } from '@/contexts/auth-context';
import {
  Users,
  Shield,
  Settings,
  Github,
  Calendar,
  FolderOpen,
  FileText,
  Mail,
  Award,
  UserCheck,
  LogOut,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  MapPin,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Officer } from '@/lib/firebase-collections';
import { ProjectManagement } from '@/components/admin/project-management';
import { ResourceManagement } from '@/components/admin/resource-management';
import { BlogManagement } from '@/components/admin/blog-management';
import { NewsletterManagement } from '@/components/admin/newsletter-management';
import { SubmissionReview } from '@/components/admin/submission-review';
import { projectService } from '@/lib/services/projects';
import { GitHubMembershipManagement } from '@/components/admin/github-membership-management';
import { MembershipApplicationReview } from '@/components/admin/membership-application-review';
import { ClubInfoSettings } from '@/components/admin/settings/club-info-settings';
import { SocialMediaSettings } from '@/components/admin/settings/social-media-settings';
import { PointsSettingsComponent } from '@/components/admin/settings/points-settings';
import { BadgeManagement } from '@/components/admin/settings/badge-management';
import { ManualBadgeAward } from '@/components/admin/settings/manual-badge-award';
import { GitHubOrgSettings } from '@/components/admin/settings/github-org-settings';
import { EmailSettingsComponent } from '@/components/admin/settings/email-settings';
import { useEvents, useEventActions } from '@/hooks/useEvents';
import { EventForm } from '@/components/events/event-form';
import { EventWithRsvps } from '@/lib/services/events';
import { format } from 'date-fns';
import { useChallenges } from '@/hooks/useChallenges';
import { ChallengeManagement } from '@/components/admin/challenge-management';
import { Challenge } from '@/lib/firebase-collections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import { Save, Upload, X } from 'lucide-react';

// Predefined officer roles
const OFFICER_ROLES = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Technical Lead',
  'Events Coordinator',
  'Outreach Officer',
  'Social Media Manager',
  'Project Manager',
  'Mentor Coordinator',
  'Workshop Lead',
  'Community Liaison'
];

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date | null;
  lastLoginAt: Date | null;
  photoURL?: string;
}

interface OfficerFormData {
  name: string;
  role: string;
  bio: string;
  email: string;
  githubUrl: string;
  imageUrl: string;
  order: number;
}

export default function AdminPage() {
  const { userProfile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [projectStats, setProjectStats] = useState({ total: 0, pending: 0, featured: 0 });
  const [loading, setLoading] = useState(true);
  const [officersLoading, setOfficersLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isOfficerDialogOpen, setIsOfficerDialogOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [officerForm, setOfficerForm] = useState<OfficerFormData>({
    name: '',
    role: '',
    bio: '',
    email: '',
    githubUrl: '',
    imageUrl: '',
    order: 0,
  });

  const links = [
    {
      label: 'Users',
      href: '#users',
      icon: <Users className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('users'),
      group: 'management',
    },
    {
      label: 'Applications',
      href: '#applications',
      icon: <UserCheck className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('applications'),
      group: 'management',
    },
    {
      label: 'GitHub Org',
      href: '#github',
      icon: <Github className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('github'),
      group: 'management',
    },
    {
      label: 'Officers',
      href: '#officers',
      icon: <Shield className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('officers'),
      group: 'management',
    },
    {
      label: 'Challenges',
      href: '#challenges',
      icon: <Award className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('challenges'),
      group: 'content',
    },
    {
      label: 'Submissions',
      href: '#submissions',
      icon: <Award className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('submissions'),
      group: 'content',
    },
    {
      label: 'Blog',
      href: '#blog',
      icon: <FileText className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('blog'),
      group: 'content',
    },
    {
      label: 'Newsletter',
      href: '#newsletter',
      icon: <Mail className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('newsletter'),
      group: 'content',
    },
    {
      label: 'Projects',
      href: '#projects',
      icon: <FolderOpen className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('projects'),
      group: 'content',
    },
    {
      label: 'Resources',
      href: '#resources',
      icon: <FileText className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('resources'),
      group: 'content',
    },
    {
      label: 'Events',
      href: '#events',
      icon: <Calendar className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('events'),
      group: 'content',
    },
    {
      label: 'Settings',
      href: '#settings',
      icon: <Settings className="h-5 w-5 shrink-0" />,
      onClick: () => setActiveSection('settings'),
      group: 'system',
    },
  ];

  const fetchUsers = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const officersQuery = query(
        collection(db, 'officers'),
        orderBy('order', 'asc')
      );
      const querySnapshot = await getDocs(officersQuery);
      const officersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Officer[];
      setOfficers(officersData);
    } catch (error) {
      console.error('Error fetching officers:', error);
    } finally {
      setOfficersLoading(false);
    }
  };

  const fetchProjectStats = async () => {
    try {
      const [allProjects, pendingProjects, featuredProjects] = await Promise.all([
        projectService.getProjects({}),
        projectService.getPendingProjects(),
        projectService.getFeaturedProjects()
      ]);
      
      setProjectStats({
        total: allProjects.length,
        pending: pendingProjects.length,
        featured: featuredProjects.length
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
    }
  };

  const resetOfficerForm = () => {
    setOfficerForm({
      name: '',
      role: '',
      bio: '',
      email: '',
      githubUrl: '',
      imageUrl: '',
      order: officers.length,
    });
    setEditingOfficer(null);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const timestamp = Date.now();
      const filename = `officers/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const imageRef = ref(storage, filename);
      
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageUrl: string) => {
    try {
      const decodedUrl = decodeURIComponent(imageUrl);
      const pathMatch = decodedUrl.match(/\/o\/(.+?)\?/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        const imageRef = ref(storage, filePath);
        await deleteObject(imageRef);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleSaveOfficer = async () => {
    try {
      if (!officerForm.name || !officerForm.role || !officerForm.bio || !officerForm.email) {
        alert('Please fill in all required fields');
        return;
      }

      setUploading(true);

      let finalImageUrl = officerForm.imageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
        
        if (editingOfficer && editingOfficer.imageUrl && editingOfficer.imageUrl !== finalImageUrl) {
          await deleteImage(editingOfficer.imageUrl);
        }
      }

      const officerData = {
        ...officerForm,
        imageUrl: finalImageUrl,
        updatedAt: Timestamp.now(),
      };

      if (editingOfficer) {
        await updateDoc(doc(db, 'officers', editingOfficer.id), officerData);
      } else {
        await addDoc(collection(db, 'officers'), {
          ...officerData,
          createdAt: Timestamp.now(),
        });
      }

      await fetchOfficers();
      setIsOfficerDialogOpen(false);
      resetOfficerForm();
    } catch (error) {
      console.error('Error saving officer:', error);
      alert('Error saving officer. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditOfficer = (officer: Officer) => {
    setEditingOfficer(officer);
    setOfficerForm({
      name: officer.name,
      role: officer.role,
      bio: officer.bio,
      email: officer.email,
      githubUrl: officer.githubUrl || '',
      imageUrl: officer.imageUrl || '',
      order: officer.order,
    });
    setPreviewUrl(officer.imageUrl || '');
    setIsOfficerDialogOpen(true);
  };

  const handleDeleteOfficer = async (officer: Officer) => {
    if (!confirm(`Are you sure you want to delete ${officer.name}?`)) {
      return;
    }

    try {
      if (officer.imageUrl) {
        await deleteImage(officer.imageUrl);
      }
      
      await deleteDoc(doc(db, 'officers', officer.id));
      await fetchOfficers();
    } catch (error) {
      console.error('Error deleting officer:', error);
      alert('Error deleting officer. Please try again.');
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      setUpdating(userId);
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
      });
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchOfficers();
    fetchProjectStats();
  }, []);

  return (
    <ProtectedRoute requiredRoles={['admin', 'officer']}>
      <div className="fixed top-16 left-0 right-0 bottom-0 flex w-full bg-muted overflow-hidden">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
              {open ? <Logo /> : <LogoIcon />}
              <div className="mt-8 flex flex-col gap-1">
                {links.map((link, idx) => {
                  const isActive = activeSection === link.href.slice(1);
                  const prevLink = links[idx - 1];
                  const showDivider = prevLink && prevLink.group !== link.group;
                  
                  return (
                    <div key={idx}>
                      {showDivider && (
                        <div className="my-3 mx-2 border-t border-border opacity-50" />
                      )}
                      <div
                        onClick={link.onClick}
                        className={cn(
                          "cursor-pointer rounded-lg transition-all relative",
                          isActive && "bg-primary/10 shadow-sm"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-primary rounded-r-full" />
                        )}
                        <div className={cn(isActive && "text-primary font-medium")}>
                          <SidebarLink link={link} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
        <AdminDashboard
          activeSection={activeSection}
          users={users}
          officers={officers}
          projectStats={projectStats}
          loading={loading}
          officersLoading={officersLoading}
          updating={updating}
          updateUserRole={updateUserRole}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          isOfficerDialogOpen={isOfficerDialogOpen}
          setIsOfficerDialogOpen={setIsOfficerDialogOpen}
          officerForm={officerForm}
          setOfficerForm={setOfficerForm}
          editingOfficer={editingOfficer}
          handleSaveOfficer={handleSaveOfficer}
          handleEditOfficer={handleEditOfficer}
          handleDeleteOfficer={handleDeleteOfficer}
          resetOfficerForm={resetOfficerForm}
          handleFileSelect={handleFileSelect}
          previewUrl={previewUrl}
          setPreviewUrl={setPreviewUrl}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          uploading={uploading}
        />
      </div>
    </ProtectedRoute>
  );
}

const Logo = () => {
  return (
    <a
      href="/admin"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal ml-2"
    >
      <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <Shield className="h-5 w-5 text-white" />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-foreground"
      >
        Admin Panel
      </motion.span>
    </a>
  );
};

const LogoIcon = () => {
  return (
    <a
      href="/admin"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal ml-2"
    >
      <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <Shield className="h-5 w-5 text-white" />
      </div>
    </a>
  );
};

// Challenges Section Component
function ChallengesSection() {
  const { challenges, loading, refetch } = useChallenges();
  const [activeTab, setActiveTab] = useState('challenges');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold">Challenge Administration</h2>
          <p className="text-muted-foreground">
            Manage coding challenges and review student submissions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="challenges">Manage Challenges</TabsTrigger>
          <TabsTrigger value="submissions">Review Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges">
          <ChallengeManagement
            challenges={challenges}
            onChallengeUpdate={refetch}
          />
        </TabsContent>

        <TabsContent value="submissions">
          <SubmissionReview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Events Section Component
function AdminEventCard({ event, onEdit, onDelete }: {
  event: EventWithRsvps;
  onEdit: (event: EventWithRsvps) => void;
  onDelete: (event: EventWithRsvps) => void;
}) {
  const eventDate = event.date.toDate();
  const isPastEvent = eventDate < new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {event.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {isPastEvent && (
                <Badge variant="outline" className="text-xs">
                  Past Event
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/events/${event.id}`} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Event
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(event)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(event)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(eventDate, 'MMM d, yyyy h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {event.rsvpCount.yes} going, {event.rsvpCount.total} total RSVPs
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventsSection() {
  const { events, loading, refetch } = useEvents();
  const { deleteEvent } = useEventActions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithRsvps | null>(null);

  const handleEdit = (event: EventWithRsvps) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleDelete = async (event: EventWithRsvps) => {
    const success = await deleteEvent(event.id);
    if (success) {
      refetch();
    }
  };

  const handleEventSubmit = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setEditingEvent(null);
    refetch();
  };

  const upcomingEvents = events.filter(event => event.date.toDate() > new Date());
  const pastEvents = events.filter(event => event.date.toDate() <= new Date());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-muted-foreground">
            Create, edit, and manage club events
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new event for the club.
              </DialogDescription>
            </DialogHeader>
            <EventForm
              onSubmit={handleEventSubmit}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
            <div className="text-sm text-muted-foreground">Upcoming Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">
              {upcomingEvents.reduce((sum, event) => sum + event.rsvpCount.yes, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Expected Attendees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{pastEvents.length}</div>
            <div className="text-sm text-muted-foreground">Events Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastEvents.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({events.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first event to get started.
                </p>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Event
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {upcomingEvents.map(event => (
                <AdminEventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          {pastEvents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No past events</h3>
                <p className="text-muted-foreground">
                  Past events will appear here after they&apos;re completed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {pastEvents.map(event => (
                <AdminEventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6">
            {events.map(event => (
              <AdminEventCard
                key={event.id}
                event={event}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event details below.
            </DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <EventForm
              event={editingEvent}
              onSubmit={handleEventSubmit}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingEvent(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main dashboard content component
const AdminDashboard = ({
  activeSection,
  users,
  officers,
  projectStats,
  loading,
  officersLoading,
  updating,
  updateUserRole,
  userSearch,
  setUserSearch,
  roleFilter,
  setRoleFilter,
  isOfficerDialogOpen,
  setIsOfficerDialogOpen,
  officerForm,
  setOfficerForm,
  editingOfficer,
  handleSaveOfficer,
  handleEditOfficer,
  handleDeleteOfficer,
  resetOfficerForm,
  handleFileSelect,
  previewUrl,
  setPreviewUrl,
  selectedFile,
  setSelectedFile,
  uploading,
}: {
  activeSection: string;
  users: User[];
  officers: Officer[];
  projectStats: { total: number; pending: number; featured: number };
  loading: boolean;
  officersLoading: boolean;
  updating: string | null;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  userSearch: string;
  setUserSearch: (search: string) => void;
  roleFilter: UserRole | 'all';
  setRoleFilter: (filter: UserRole | 'all') => void;
  isOfficerDialogOpen: boolean;
  setIsOfficerDialogOpen: (open: boolean) => void;
  officerForm: OfficerFormData;
  setOfficerForm: (form: OfficerFormData) => void;
  editingOfficer: Officer | null;
  handleSaveOfficer: () => Promise<void>;
  handleEditOfficer: (officer: Officer) => void;
  handleDeleteOfficer: (officer: Officer) => Promise<void>;
  resetOfficerForm: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  previewUrl: string;
  setPreviewUrl: (url: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  uploading: boolean;
}) => {
  // Filter users based on search and role filter
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = user.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto bg-card p-6 md:p-10 shadow-inner scrollbar-thin">
        {activeSection !== 'events' && activeSection !== 'challenges' && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your coding club&apos;s {activeSection}
            </p>
          </div>
        )}

        {/* Users Section */}
        {activeSection === 'users' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | 'all')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="officer">Officer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user: User) => (
                      <div key={user.uid} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          {user.photoURL && (
                            <img src={user.photoURL} alt={user.displayName} className="h-10 w-10 rounded-full" />
                          )}
                          <div>
                            <p className="font-medium">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.uid, value as UserRole)}
                          disabled={updating === user.uid}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="guest">Guest</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="officer">Officer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Applications Section */}
        {activeSection === 'applications' && (
          <MembershipApplicationReview />
        )}

        {/* GitHub Org Section */}
        {activeSection === 'github' && (
          <GitHubMembershipManagement />
        )}

        {/* Officers Section */}
        {activeSection === 'officers' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Officers Management</CardTitle>
              <Dialog open={isOfficerDialogOpen} onOpenChange={setIsOfficerDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetOfficerForm(); setIsOfficerDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Officer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingOfficer ? 'Edit Officer' : 'Add New Officer'}</DialogTitle>
                    <DialogDescription>
                      {editingOfficer ? 'Update officer information' : 'Add a new officer to your club'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                          {(previewUrl || officerForm.imageUrl) ? (
                            <div className="relative group">
                              <Image 
                                src={previewUrl || officerForm.imageUrl} 
                                alt="Profile preview" 
                                width={80}
                                height={80}
                                className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={() => {
                                  setSelectedFile(null);
                                  setPreviewUrl('');
                                  setOfficerForm({...officerForm, imageUrl: ''});
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                              <Upload className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="imageUpload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('imageUpload')?.click()}
                            disabled={uploading}
                          >
                            {uploading ? 'Uploading...' : 'Choose Image'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={officerForm.name}
                          onChange={(e) => setOfficerForm({...officerForm, name: e.target.value})}
                          placeholder="e.g. Sarah Johnson"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="role">Position *</Label>
                        <Select 
                          value={officerForm.role} 
                          onValueChange={(value) => setOfficerForm({...officerForm, role: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a position" />
                          </SelectTrigger>
                          <SelectContent>
                            {OFFICER_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={officerForm.email}
                        onChange={(e) => setOfficerForm({...officerForm, email: e.target.value})}
                        placeholder="sarah.johnson@student.rhs.edu"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Biography *</Label>
                      <Textarea
                        id="bio"
                        value={officerForm.bio}
                        onChange={(e) => setOfficerForm({...officerForm, bio: e.target.value})}
                        placeholder="Share the officer's background..."
                        className="min-h-[100px]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="githubUrl">GitHub URL</Label>
                      <Input
                        id="githubUrl"
                        value={officerForm.githubUrl}
                        onChange={(e) => setOfficerForm({...officerForm, githubUrl: e.target.value})}
                        placeholder="https://github.com/username"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsOfficerDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveOfficer} disabled={uploading}>
                        {uploading ? 'Saving...' : 'Save Officer'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {officersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {officers.map((officer: Officer) => (
                    <div
                      key={officer.id}
                      className="group relative bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary"
                    >
                      <div className="flex items-start gap-4">
                        {/* Profile Image */}
                        <div className="flex-shrink-0">
                          {officer.imageUrl ? (
                            <Image 
                              src={officer.imageUrl} 
                              alt={officer.name}
                              width={64}
                              height={64}
                              className="w-16 h-16 rounded-xl object-cover border-2 border-border"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-border">
                              <span className="text-xl font-semibold text-primary">
                                {officer.name ? officer.name.split(' ').map(n => n[0]).join('') : 'O'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Officer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg text-foreground">
                                {officer.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="secondary" 
                                  className="bg-primary/10 text-primary border-primary/20"
                                >
                                  {officer.role}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Order: {officer.order}
                                </span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOfficer(officer)}
                                disabled={updating === officer.id}
                                className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOfficer(officer)}
                                disabled={updating === officer.id}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                {updating === officer.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {officer.bio}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <span>{officer.email}</span>
                            </div>
                            {officer.githubUrl && (
                              <div className="flex items-center gap-1">
                                <Github className="h-4 w-4" />
                                <a 
                                  href={officer.githubUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-primary transition-colors"
                                >
                                  GitHub
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Challenges Section */}
        {activeSection === 'challenges' && <ChallengesSection />}

        {/* Submissions Section */}
        {activeSection === 'submissions' && (
          <SubmissionReview />
        )}

        {/* Blog Section */}
        {activeSection === 'blog' && (
          <BlogManagement />
        )}

        {/* Newsletter Section */}
        {activeSection === 'newsletter' && (
          <NewsletterManagement />
        )}

        {/* Projects Section */}
        {activeSection === 'projects' && (
          <ProjectManagement />
        )}

        {/* Resources Section */}
        {activeSection === 'resources' && (
          <ResourceManagement />
        )}

        {/* Events Section */}
        {activeSection === 'events' && <EventsSection />}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Club Settings</h2>
              <p className="text-muted-foreground">
                Configure your club&apos;s information, branding, and online presence
              </p>
            </div>
            
            <Tabs defaultValue="club-info" className="w-full">
              <TabsList className="grid w-full max-w-5xl grid-cols-7">
                <TabsTrigger value="club-info">Club Info</TabsTrigger>
                <TabsTrigger value="social-media">Social</TabsTrigger>
                <TabsTrigger value="points-system">Points</TabsTrigger>
                <TabsTrigger value="badges">Badges</TabsTrigger>
                <TabsTrigger value="award-badges">Award</TabsTrigger>
                <TabsTrigger value="github-org">GitHub</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
              
              <TabsContent value="club-info" className="mt-6">
                <ClubInfoSettings />
              </TabsContent>
              
              <TabsContent value="social-media" className="mt-6">
                <SocialMediaSettings />
              </TabsContent>
              
              <TabsContent value="points-system" className="mt-6">
                <PointsSettingsComponent />
              </TabsContent>
              
              <TabsContent value="badges" className="mt-6">
                <BadgeManagement />
              </TabsContent>
              
              <TabsContent value="award-badges" className="mt-6">
                <ManualBadgeAward />
              </TabsContent>
              
              <TabsContent value="github-org" className="mt-6">
                <GitHubOrgSettings />
              </TabsContent>
              
              <TabsContent value="email" className="mt-6">
                <EmailSettingsComponent />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

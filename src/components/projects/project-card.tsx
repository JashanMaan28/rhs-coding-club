import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Github, ExternalLink, Star, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ProjectWithAuthor } from '@/lib/services/projects';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: ProjectWithAuthor;
}

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const createdDate = project.createdAt.toDate();

  return (
    <Card className="h-full overflow-hidden group hover:shadow-lg transition-shadow">
      {project.images && project.images.length > 0 && (
        <div className="relative h-48 overflow-hidden">
          <Image
            src={project.images[0]}
            alt={project.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {project.featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-yellow-500 text-yellow-50">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
        </div>
      )}
      
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-xl line-clamp-2">
            <Link 
              href={`/projects/${project.id}`}
              className="hover:text-primary transition-colors"
            >
              {project.title}
            </Link>
          </CardTitle>
          <p className="text-muted-foreground text-sm line-clamp-3">
            {project.description}
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Technologies</h4>
          <div className="flex flex-wrap gap-1">
            {project.tech.slice(0, 4).map(tech => (
              <Badge key={tech} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
            {project.tech.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{project.tech.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {project.authorName}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDistanceToNow(createdDate, { addSuffix: true })}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {project.repoUrl && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href={project.repoUrl} target="_blank">
                <Github className="h-4 w-4 mr-2" />
                Code
              </Link>
            </Button>
          )}
          {project.demoUrl && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href={project.demoUrl} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Demo
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

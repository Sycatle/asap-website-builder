import { useEffect, useState, useMemo } from 'react';
import { useWebsitesQuery } from '@/lib/query';
import { formatDate } from '@/lib/utils/formatters';
import { PageHeader } from '@/components/shared/page-header';
import { PageIcon } from '@/lib/navigation-config';
import { 
  UserPlus, 
  Shield, 
  Mail,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Pencil,
  Crown,
  Check,
  Clock,
  X,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldLabel,
} from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface Administrator {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, any>;
  status: string;
  invited_at: string;
  accepted_at?: string;
  last_access_at?: string;
}

interface AdministratorsResponse {
  administrators: Administrator[];
  total: number;
}

const roleLabels: Record<string, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Lecteur',
};

const roleDescriptions: Record<string, string> = {
  admin: 'Peut gérer le site, les extensions et inviter des collaborateurs',
  editor: 'Peut modifier le contenu mais pas les paramètres',
  viewer: 'Peut uniquement consulter le site',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Actif', color: 'bg-green-500', icon: Check },
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  revoked: { label: 'Révoqué', color: 'bg-red-500', icon: X },
};

export default function AdministratorsPage() {
  const { data: websites = [], isLoading: websitesLoading } = useWebsitesQuery();
  const currentWebsite = websites[0] || null;
  
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; admin: Administrator | null }>({
    open: false,
    admin: null,
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; admin: Administrator | null }>({
    open: false,
    admin: null,
  });
  const [editRole, setEditRole] = useState('');

  // Fetch administrators
  const fetchAdministrators = async () => {
    if (!currentWebsite) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.get<AdministratorsResponse>(
        `/websites/${currentWebsite.id}/administrators`
      );
      setAdministrators(response.administrators);
    } catch (error) {
      console.error('Failed to fetch administrators:', error);
      toast.error('Erreur lors du chargement des administrateurs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentWebsite) {
      fetchAdministrators();
    }
  }, [currentWebsite?.id]);

  // Invite administrator
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWebsite || !inviteEmail) return;

    setIsInviting(true);
    try {
      await apiClient.post(`/websites/${currentWebsite.id}/administrators/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      
      toast.success('Invitation envoyée avec succès');
      setInviteEmail('');
      setInviteRole('editor');
      fetchAdministrators();
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Erreur lors de l\'envoi de l\'invitation';
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  // Update administrator role
  const handleUpdateRole = async () => {
    if (!currentWebsite || !editDialog.admin) return;

    try {
      await apiClient.patch(
        `/websites/${currentWebsite.id}/administrators/${editDialog.admin.id}`,
        { role: editRole }
      );
      
      toast.success('Rôle mis à jour');
      setEditDialog({ open: false, admin: null });
      fetchAdministrators();
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Erreur lors de la mise à jour';
      toast.error(message);
    }
  };

  // Remove administrator
  const handleRemove = async () => {
    if (!currentWebsite || !deleteDialog.admin) return;

    try {
      await apiClient.delete(
        `/websites/${currentWebsite.id}/administrators/${deleteDialog.admin.id}`
      );
      
      toast.success('Administrateur supprimé');
      setDeleteDialog({ open: false, admin: null });
      fetchAdministrators();
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Erreur lors de la suppression';
      toast.error(message);
    }
  };

  // Resend invitation
  const handleResendInvitation = async (admin: Administrator) => {
    if (!currentWebsite) return;

    try {
      await apiClient.post(
        `/websites/${currentWebsite.id}/administrators/${admin.id}/resend`
      );
      toast.success('Invitation renvoyée');
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Erreur lors du renvoi';
      toast.error(message);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const active = administrators.filter(a => a.status === 'active').length;
    const pending = administrators.filter(a => a.status === 'pending').length;
    return { total: administrators.length, active, pending };
  }, [administrators]);

  if (websitesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentWebsite) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Users className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sélectionnez un site pour gérer les administrateurs</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Administrateurs"
        subtitle="Gérez les accès et permissions des collaborateurs de votre site"
        icon={<PageIcon page="administrators" />}
        badge={{
          label: `${stats.total} collaborateur${stats.total > 1 ? 's' : ''}`,
          variant: 'outline',
        }}
        backHref={currentWebsite ? `/${currentWebsite.id}` : '/'}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <PageIcon page="administrators" size="md" />
              <div className="hidden sm:flex items-center gap-3">
                <p className="text-sm font-semibold">Administrateurs</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5">
                    <Check className="h-2.5 w-2.5 mr-1 text-green-500" />
                    {stats.active} actif{stats.active > 1 ? 's' : ''}
                  </Badge>
                  {stats.pending > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      <Clock className="h-2.5 w-2.5 mr-1 text-yellow-500" />
                      {stats.pending} en attente
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <TooltipProvider>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Users className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Nombre total de collaborateurs</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actifs</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Check className="h-4 w-4 text-green-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Collaborateurs ayant accepté l'invitation</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Clock className="h-4 w-4 text-yellow-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Invitations en attente d'acceptation</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </TooltipProvider>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter un collaborateur
          </CardTitle>
          <CardDescription>
            Ajoutez une personne pour collaborer sur votre site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4">
            <Field className="flex-1">
              <FieldLabel htmlFor="email">Adresse email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="collaborateur@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </Field>
            <Field className="sm:w-48">
              <FieldLabel htmlFor="role">Rôle</FieldLabel>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Administrateur
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Pencil className="h-4 w-4" />
                      Éditeur
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Lecteur
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={isInviting || !inviteEmail}>
                {isInviting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Envoyer l'invitation
              </Button>
            </div>
          </form>
          {inviteRole && (
            <p className="text-sm text-muted-foreground mt-3">
              {roleDescriptions[inviteRole]}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Administrators Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collaborateurs</CardTitle>
          <CardDescription>
            Liste des personnes ayant accès à ce site
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : administrators.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <Users className="h-8 w-8" />
              <p>Aucun collaborateur pour le moment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {administrators.map((admin) => {
                  const statusInfo = statusConfig[admin.status] || statusConfig.active;
                  const StatusIcon = statusInfo.icon;
                  const isOwner = admin.role === 'owner';

                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isOwner && <Crown className="h-4 w-4 text-yellow-500" />}
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabels[admin.role] || admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
                          {statusInfo.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(admin.last_access_at)}
                      </TableCell>
                      <TableCell>
                        {!isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditRole(admin.role);
                                  setEditDialog({ open: true, admin });
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifier le rôle
                              </DropdownMenuItem>
                              {admin.status === 'pending' && (
                                <DropdownMenuItem
                                  onClick={() => handleResendInvitation(admin)}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Renvoyer l'invitation
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteDialog({ open: true, admin })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, admin: open ? editDialog.admin : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Changer le niveau d'accès de {editDialog.admin?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="editor">Éditeur</SelectItem>
                <SelectItem value="viewer">Lecteur</SelectItem>
              </SelectContent>
            </Select>
            {editRole && (
              <p className="text-sm text-muted-foreground mt-2">
                {roleDescriptions[editRole]}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, admin: null })}>
              Annuler
            </Button>
            <Button onClick={handleUpdateRole}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, admin: open ? deleteDialog.admin : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'accès</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer l'accès à {deleteDialog.admin?.email} ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, admin: null })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

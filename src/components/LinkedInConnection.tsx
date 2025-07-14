import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Linkedin, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  Unlink,
  RefreshCw,
  User
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface LinkedInConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

const LinkedInConnection: React.FC<LinkedInConnectionProps> = ({ onConnectionChange }) => {
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConfiguration();
    checkConnection();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await apiClient.getLinkedInStatus();
      setConfigured(response.configured);
      if (!response.configured) {
        toast({
          title: "LinkedIn Not Configured",
          description: "LinkedIn integration is not set up. Please contact your administrator.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('LinkedIn configuration check failed:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      const response = await apiClient.getLinkedInConnection();
      setConnected(response.connected);
      setConnection(response.connection);
      onConnectionChange?.(response.connected);
    } catch (error) {
      console.error('LinkedIn connection check failed:', error);
    }
  };

  const handleConnect = async () => {
    if (!configured) {
      toast({
        title: "LinkedIn Not Configured",
        description: "Please configure LinkedIn integration first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.initiateLinkedInAuth();
      // Redirect to LinkedIn OAuth
      window.location.href = response.authUrl;
    } catch (error) {
      console.error('LinkedIn auth initiation failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate LinkedIn connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account? This will stop syncing messages and prevent posting.')) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.disconnectLinkedIn();
      setConnected(false);
      setConnection(null);
      onConnectionChange?.(false);
      toast({
        title: "Disconnected",
        description: "LinkedIn account has been disconnected successfully.",
      });
    } catch (error) {
      console.error('LinkedIn disconnect failed:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect LinkedIn account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiClient.syncLinkedInData();
      toast({
        title: "Sync Complete",
        description: "LinkedIn data has been synchronized successfully.",
      });
    } catch (error) {
      console.error('LinkedIn sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync LinkedIn data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (configLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <p>Checking LinkedIn configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            LinkedIn Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              LinkedIn integration is not configured. Please contact your administrator to set up LinkedIn API credentials.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          LinkedIn Integration
          {connected && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected && connection ? (
          <div className="space-y-4">
            {/* Profile Info */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={connection.profilePictureUrl} alt={`${connection.firstName} ${connection.lastName}`} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">
                  {connection.firstName} {connection.lastName}
                </div>
                {connection.headline && (
                  <div className="text-sm text-gray-600">{connection.headline}</div>
                )}
                {connection.email && (
                  <div className="text-sm text-gray-500">{connection.email}</div>
                )}
              </div>
              {connection.publicProfileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(connection.publicProfileUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Data
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Linkedin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Your LinkedIn Account</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Connect your LinkedIn account to send messages, create posts, and manage your LinkedIn presence directly from your CRM.
              </p>
              
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Send and receive LinkedIn messages
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Create and schedule LinkedIn posts
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Sync LinkedIn connections with CRM
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  AI-powered message drafting
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Linkedin className="h-4 w-4 mr-2" />
                )}
                Connect LinkedIn Account
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LinkedInConnection; 
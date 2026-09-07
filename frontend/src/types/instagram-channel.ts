export interface InstagramUserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  connectedAt: string;
}

export interface InstagramDiscoveredAccount {
  instagramBusinessId: string;
  pageId: string;
  pageName: string;
  username: string;
  name: string;
  profilePictureUrl: string | null;
  followerCount?: number;
  accessToken: string;
  isAlreadyConnected: boolean;
  isConnectedToCurrentWorkspace?: boolean;
  isConnectedToOtherWorkspace?: boolean;
  connectedWorkspaceName?: string;
  accessTokenStatus?: 'valid' | 'expired' | 'revoked';
}

export interface InstagramChannelConfig {
  instagramBusinessId: string;
  pageId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string | null;
  channelName: string;
  colorCode: string;
  autoReplyEnabled: boolean;
  welcomeMessage?: string;
}

export type ConnectInstagramStep =
  | 'AUTH'
  | 'SELECT_ACCOUNT'
  | 'CONFIGURE'
  | 'PROVISIONING'
  | 'SUCCESS';

export interface InstagramWebhookHandshakeStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

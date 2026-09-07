export interface FacebookUserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  connectedAt: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  avatarUrl: string;
  followerCount: number;
  likesCount: number;
  hasAdminPermission: boolean;
  isConnectedToCurrentWorkspace: boolean;
  isConnectedToOtherWorkspace: boolean;
  connectedWorkspaceName?: string;
  accessTokenStatus: 'valid' | 'expired' | 'revoked';
  accessToken?: string;
}

export interface FacebookChannelConfig {
  pageId: string;
  pageName: string;
  pageAvatarUrl: string;
  channelName: string;
  colorCode: string;
  autoReplyEnabled: boolean;
  botHandoffEnabled: boolean;
  messagingPostbacksEnabled: boolean;
  commentTrackingEnabled: boolean;
  welcomeMessageText?: string;
}

export type ConnectFacebookStep =
  | 'AUTH'
  | 'SELECT_PAGE'
  | 'CONFIGURE'
  | 'PROVISIONING'
  | 'SUCCESS';

export interface WebhookHandshakeStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

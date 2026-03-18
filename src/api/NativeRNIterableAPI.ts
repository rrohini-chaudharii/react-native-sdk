import type { TurboModule, UnsafeObject } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// NOTE: No types can be imported because of the way new arch works, so we have
// to re-define the types here.
interface EmbeddedMessage {
  metadata: {
    messageId: string;
    placementId: number;
    campaignId?: number | null;
    isProof?: boolean;
  };
  elements: {
    buttons?:
      | ReadonlyArray<{
          id: string;
          title?: string | null;
          action: { type: string; data?: string } | null;
        }>
      | null;
    body?: string | null;
    mediaUrl?: string | null;
    mediaUrlCaption?: string | null;
    defaultAction?: { type: string; data?: string } | null;
    text?:
      | ReadonlyArray<{ id: string; text?: string | null; label?: string | null }>
      | null;
    title?: string | null;
  } | null;
  payload?: { [key: string]: string | number | boolean | null } | null;
}

export interface Spec extends TurboModule {
  // Initialization
  initializeWithApiKey(
    apiKey: string,
    config: UnsafeObject,
    version: string
  ): Promise<boolean>;

  initialize2WithApiKey(
    apiKey: string,
    config: UnsafeObject,
    version: string,
    apiEndPointOverride: string
  ): Promise<boolean>;

  // User management
  setEmail(email: string | null, authToken?: string | null): void;
  getEmail(): Promise<string | null>;
  setUserId(userId?: string | null, authToken?: string | null): void;
  getUserId(): Promise<string | null | undefined>;

  // In-app messaging
  setInAppShowResponse(number: number): void;
  getInAppMessages(): Promise<
    ReadonlyArray<{ [key: string]: string | number | boolean }>
  >;
  getInboxMessages(): Promise<
    ReadonlyArray<{ [key: string]: string | number | boolean }>
  >;
  getUnreadInboxMessagesCount(): Promise<number>;
  showMessage(messageId: string, consume: boolean): Promise<string | null>;
  removeMessage(messageId: string, location: number, source: number): void;
  setReadForMessage(messageId: string, read: boolean): void;
  setAutoDisplayPaused(autoDisplayPaused: boolean): void;

  // Tracking
  trackEvent(
    name: string,
    dataFields?: { [key: string]: string | number | boolean }
  ): void;
  trackPushOpenWithCampaignId(
    campaignId: number,
    templateId: number | null,
    messageId: string,
    appAlreadyRunning: boolean,
    dataFields?: { [key: string]: string | number | boolean }
  ): void;
  trackInAppOpen(messageId: string, location: number): void;
  trackInAppClick(
    messageId: string,
    location: number,
    clickedUrl: string
  ): void;
  trackInAppClose(
    messageId: string,
    location: number,
    source: number,
    clickedUrl?: string | null
  ): void;
  inAppConsume(messageId: string, location: number, source: number): void;

  // Commerce
  updateCart(
    items: ReadonlyArray<{ [key: string]: string | number | boolean }>
  ): void;
  trackPurchase(
    total: number,
    items: ReadonlyArray<{ [key: string]: string | number | boolean }>,
    dataFields?: { [key: string]: string | number | boolean }
  ): void;

  // User data
  updateUser(
    dataFields: { [key: string]: string | number | boolean },
    mergeNestedObjects: boolean
  ): void;
  updateEmail(email: string, authToken?: string): void;

  // Attribution
  getAttributionInfo(): Promise<{
    [key: string]: string | number | boolean;
  } | null>;
  setAttributionInfo(
    dict: { [key: string]: string | number | boolean } | null
  ): void;

  // Device management
  disableDeviceForCurrentUser(): void;
  getLastPushPayload(): Promise<{
    [key: string]: string | number | boolean;
  } | null>;

  // Content
  getHtmlInAppContentForMessage(
    messageId: string
  ): Promise<{ [key: string]: string | number | boolean }>;

  // App links
  handleAppLink(appLink: string): Promise<boolean>;

  // Subscriptions
  updateSubscriptions(
    emailListIds: ReadonlyArray<number> | null,
    unsubscribedChannelIds: ReadonlyArray<number> | null,
    unsubscribedMessageTypeIds: ReadonlyArray<number> | null,
    subscribedMessageTypeIds: ReadonlyArray<number> | null,
    campaignId: number,
    templateId: number
  ): void;

  // Session tracking
  startSession(
    visibleRows: ReadonlyArray<{ [key: string]: string | number | boolean }>
  ): void;
  endSession(): void;
  updateVisibleRows(
    visibleRows: ReadonlyArray<{ [key: string]: string | number | boolean }>
  ): void;

  // Auth
  passAlongAuthToken(authToken?: string | null): void;
  pauseAuthRetries(pauseRetry: boolean): void;

  // Embedded Messaging
  syncEmbeddedMessages(): void;
  startEmbeddedSession(): void;
  endEmbeddedSession(): void;
  startEmbeddedImpression(messageId: string, placementId: number): void;
  pauseEmbeddedImpression(messageId: string): void;
  getEmbeddedMessages(
    placementIds: ReadonlyArray<number> | null
  ): Promise<ReadonlyArray<EmbeddedMessage>>;
  trackEmbeddedClick(
    message: EmbeddedMessage,
    buttonId: string | null,
    clickedUrl: string | null
  ): void;

  // Wake app -- android only
  wakeApp(): void;

  // REQUIRED for RCTEventEmitter
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// Check if we're in a test environment
const isTestEnvironment = () => {
  return (
    typeof jest !== 'undefined' ||
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined
  );
};

export default isTestEnvironment()
  ? undefined
  : TurboModuleRegistry.getEnforcing<Spec>('RNIterableAPI');

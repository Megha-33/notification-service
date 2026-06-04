export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
    PARTIAL = 'PARTIAL',
}

export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}

export enum NotificationChannel {
    PUSH = 'PUSH',
    IN_APP = 'IN_APP',
    EMAIL = 'EMAIL',
    SMS = 'SMS',
}

export enum NotificationType {
    ORDER = 'ORDER',
    PROMOTION = 'PROMOTION',
    ALERT = 'ALERT',
    REMINDER = 'REMINDER',
    GENERAL = 'GENERAL',
    WELCOME = 'WELCOME',
}

from .models import Notification


def get_user_display_name(user):
    if not user:
        return "Someone"

    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return full_name or user.username or user.email


def create_notification(recipient, notification_type, title, message, metadata=None):
    if recipient is None:
        return None

    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        metadata=metadata or {},
    )

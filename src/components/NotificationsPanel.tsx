import { AlertTriangle, CheckCircle2, Info, Clock, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

const getIcon = (type: Notification["type"]) => {
  switch (type) {
    case "alert":
      return <AlertTriangle className="h-5 w-5 text-sos" />;
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-safe" />;
    case "info":
      return <Info className="h-5 w-5 text-primary" />;
  }
};

const getIconBg = (type: Notification["type"]) => {
  switch (type) {
    case "alert":
      return "bg-sos/10";
    case "success":
      return "bg-safe/10";
    case "info":
      return "bg-primary/10";
  }
};

interface NotificationsPanelProps {
  onClose: () => void;
}

const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  const { notifications, unreadCount, error, markAllRead, deleteNotification, clearAll } = useNotifications();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-muted-foreground">
          {error ? "Setup required" : unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} disabled={unreadCount === 0 || Boolean(error)}>
            <CheckCheck className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
          <Button variant="ghost" size="sm" onClick={() => clearAll.mutate()} disabled={notifications.length === 0 || Boolean(error)}>
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
      <Separator />
      <ScrollArea className="-mx-6 flex-1 px-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Notifications unavailable</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2 py-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group relative rounded-xl p-4 transition-colors ${notification.read ? "bg-muted/30" : "bg-accent/50"}`}
              >
                <div className="flex gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${getIconBg(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-foreground ${!notification.read ? "font-semibold" : "font-medium"}`}>{notification.title}</p>
                      {!notification.read && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteNotification.mutate(notification.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default NotificationsPanel;

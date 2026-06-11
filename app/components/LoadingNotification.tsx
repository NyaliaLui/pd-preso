interface LoadingNotificationProps {
  show: boolean;
  text?: string;
}

export function LoadingNotification({ show, text }: LoadingNotificationProps) {
  if (!show) return null;

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1/2 bg-gray-900/40 p-8 rounded-r-2xl z-50">
      <p className="text-white text-2xl font-semibold">
        {text ?? 'Drag and drop one of the icons on the Knight or Elephant.'}
      </p>
    </div>
  );
}

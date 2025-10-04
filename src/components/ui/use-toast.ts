import { toast as sonnerToast } from 'sonner';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: {
      success: (toast: Omit<Toast, 'id'>) => {
        sonnerToast.success(toast.title, {
          description: toast.description,
        });
      },
      error: (toast: Omit<Toast, 'id'>) => {
        sonnerToast.error(toast.title, {
          description: toast.description,
        });
      },
      dismiss: (id: string) => {
        sonnerToast.dismiss(id);
      },
    },
    toasts: [], // Not needed for sonner
  };
}

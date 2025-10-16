import { Loader2 } from 'lucide-react';

interface CustomLoaderProps {
  message?: string;
}

export default function CustomLoader({ message = "Loading..." }: CustomLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-lg font-medium text-gray-700">{message}</p>
      </div>
    </div>
  );
}

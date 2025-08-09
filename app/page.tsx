import { Calendar } from "@/components/ui/mini-calendar";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Calendar />
      </div>
    </div>
  );
}

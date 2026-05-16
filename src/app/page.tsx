import Navbar from "@/components/navbar";
import ActivityList from "@/components/activity-list";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">当前活动</h1>
          <Link
            href="/activity/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            发起活动
          </Link>
        </div>
        <ActivityList />
      </main>
    </>
  );
}

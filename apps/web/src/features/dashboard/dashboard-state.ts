export type Discipline = 'BJJ_GI' | 'NO_GI_GRAPPLING';

export type RoadmapItem = {
  id: string;
  title: string;
  videos: { id: string; title: string }[];
};

export type Roadmap = {
  discipline: Discipline;
  items: RoadmapItem[];
  completedItems: RoadmapItem[];
  hiddenItems: RoadmapItem[];
};

export type VideoHistoryItem = {
  watchedSeconds: number;
  completed: boolean;
  video: { id: string; title: string };
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  discipline: Discipline;
  createdAt: string;
  modules: { lessons: { id: string }[] }[];
};

export function selectDashboardContent(
  roadmaps: Roadmap[],
  selectedDiscipline: Discipline | undefined,
  history: VideoHistoryItem[],
  courses: Course[],
) {
  const roadmap = roadmaps.find((item) => item.discipline === selectedDiscipline) ?? roadmaps[0];
  const discipline = roadmap?.discipline;
  const recommendedCourses = discipline
    ? courses.filter((course) => course.discipline === discipline).slice(0, 2)
    : [];
  const newCourses = [...courses]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 3);
  const nextVideoId = roadmap?.items[0]?.videos[0]?.id;
  const suggestedVideos = uniqueVideos(roadmap?.items.flatMap((item) => item.videos) ?? [])
    .filter((video) => video.id !== nextVideoId)
    .slice(0, 3);

  return {
    roadmap,
    continueVideo: history.find((item) => !item.completed),
    recommendedCourses,
    newCourses,
    suggestedVideos,
  };
}

function uniqueVideos(videos: { id: string; title: string }[]) {
  return videos.filter(
    (video, index) => videos.findIndex((candidate) => candidate.id === video.id) === index,
  );
}

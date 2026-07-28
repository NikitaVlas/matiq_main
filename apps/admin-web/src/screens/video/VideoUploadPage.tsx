'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../shared/api/client';

type Video = { id: string; title: string; published: boolean };

const hasLatinFilename = (name: string) => /^[\x20-\x7E]+$/.test(name);

export default function VideoUploadPage() {
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState('');
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);

  const load = async () => {
    const response = await adminApi('/admin/videos');
    if (response.ok) setVideos(await response.json());
  };

  useEffect(() => {
    void load();
  }, []);

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    if (!hasLatinFilename(file.name)) {
      setResult('Rename the file using Latin characters before uploading.');
      return;
    }

    setUploading(true);
    setResult('Uploading...');
    const body = new FormData();
    body.append('file', file);

    try {
      const response = await adminApi('/admin/videos/upload', { method: 'POST', body });
      if (response.ok) {
        const video = await response.json();
        setResult(`Video created: ${video.id}`);
        await load();
      } else {
        setResult(`Upload failed (${response.status})`);
      }
    } catch {
      setResult('Upload request failed');
    } finally {
      setUploading(false);
    }
  };

  const publish = async (id: string) => {
    const response = await adminApi(`/admin/videos/${id}/publish`, { method: 'POST' });
    if (response.ok) await load();
  };

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <nav>
        <a href="/">Courses</a> · <a href="/videos">Upload video</a>
      </nav>
      <h1>Upload local video</h1>
      <p>Use a Latin filename. Upload to local MinIO, then assign the video ID to a lesson.</p>
      <form onSubmit={upload}>
        <input
          type="file"
          accept="video/mp4,video/webm"
          required
          onChange={(event) => setFile(event.target.files?.[0])}
        />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload video'}
        </button>
      </form>
      {result && <p role="status">{result}</p>}
      <h2>Videos</h2>
      <ul>
        {videos.map((video) => (
          <li key={video.id}>
            <code>{video.id}</code>{' '}
            <button type="button" onClick={() => void navigator.clipboard.writeText(video.id)}>
              Copy ID
            </button>{' '}
            — {video.title} (
            {video.published ? (
              'published'
            ) : (
              <>
                <span>draft</span>{' '}
                <button type="button" onClick={() => void publish(video.id)}>
                  Publish
                </button>
              </>
            )}
            )
          </li>
        ))}
      </ul>
    </main>
  );
}

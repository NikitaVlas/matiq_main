'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../shared/api/client';

type MetadataOption = { id: string; key: string; name: string };
type MetadataField = { id: string; key: string; name: string; options: MetadataOption[] };
type RoadmapCoverage = MetadataOption & { publishedVideoCount: number };
type RoadmapDiagnostics = {
  topics: (RoadmapCoverage & { draftVideoCount: number; assessmentMappingCount: number })[];
  unlinkedVideos: { id: string; title: string }[];
};
type Video = {
  id: string;
  title: string;
  published: boolean;
  metadataValues: { option: MetadataOption & { field: { id: string; name: string } } }[];
};

const hasLatinFilename = (name: string) => /^[\x20-\x7E]+$/.test(name);
const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function VideoUploadPage() {
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState('');
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [fields, setFields] = useState<MetadataField[]>([]);
  const [roadmapCoverage, setRoadmapCoverage] = useState<RoadmapCoverage[]>([]);
  const [roadmapDiagnostics, setRoadmapDiagnostics] = useState<RoadmapDiagnostics>();
  const [editingVideoId, setEditingVideoId] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [newOptions, setNewOptions] = useState<Record<string, string>>({});
  const [newFieldName, setNewFieldName] = useState('');
  const [newRoadmapTopic, setNewRoadmapTopic] = useState('');

  const load = async () => {
    const [videosResponse, fieldsResponse, coverageResponse, diagnosticsResponse] =
      await Promise.all([
      adminApi('/admin/videos'),
      adminApi('/admin/content/metadata-fields'),
      adminApi('/admin/content/roadmap-topic-coverage'),
      adminApi('/admin/content/roadmap-diagnostics'),
    ]);
    if (videosResponse.ok) setVideos(await videosResponse.json());
    if (fieldsResponse.ok) setFields(await fieldsResponse.json());
    if (coverageResponse.ok) setRoadmapCoverage(await coverageResponse.json());
    if (diagnosticsResponse.ok) setRoadmapDiagnostics(await diagnosticsResponse.json());
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
      } else setResult(`Upload failed (${response.status})`);
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

  const beginMetadataEdit = (video: Video) => {
    setEditingVideoId(video.id);
    setSelectedOptions(
      Object.fromEntries(
        video.metadataValues.map((value) => [value.option.field.id, value.option.id]),
      ),
    );
  };

  const addOption = async (field: MetadataField) => {
    const name = newOptions[field.id]?.trim();
    if (!name) return;
    const response = await adminApi(`/admin/content/metadata-fields/${field.id}/options`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: slug(name) || `option-${Date.now()}`, name }),
    });
    if (!response.ok) {
      setResult(`Metadata option creation failed (${response.status})`);
      return;
    }
    const option = (await response.json()) as MetadataOption;
    setNewOptions((current) => ({ ...current, [field.id]: '' }));
    await load();
    setSelectedOptions((current) => ({ ...current, [field.id]: option.id }));
  };

  const addField = async () => {
    const name = newFieldName.trim();
    if (!name) return;
    const response = await adminApi('/admin/content/metadata-fields', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: slug(name) || `field-${Date.now()}`, name }),
    });
    if (!response.ok) {
      setResult(`Metadata field creation failed (${response.status})`);
      return;
    }
    setNewFieldName('');
    await load();
  };

  const addRoadmapTopic = async () => {
    const name = newRoadmapTopic.trim();
    const key = slug(name);
    if (!name || !key) {
      setResult('Use a Roadmap topic name that contains Latin letters or numbers.');
      return;
    }
    const response = await adminApi('/admin/content/roadmap-topics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, name }),
    });
    if (!response.ok) {
      setResult(
        response.status === 409
          ? 'This Roadmap topic already exists.'
          : `Roadmap topic creation failed (${response.status})`,
      );
      return;
    }
    setNewRoadmapTopic('');
    setResult('Roadmap topic added. It is now available for video metadata.');
    await load();
  };

  const saveMetadata = async () => {
    const response = await adminApi(`/admin/videos/${editingVideoId}/metadata`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ optionIds: Object.values(selectedOptions).filter(Boolean) }),
    });
    if (!response.ok) {
      setResult(`Metadata save failed (${response.status})`);
      return;
    }
    setEditingVideoId('');
    setResult('Metadata saved.');
    await load();
  };

  return (
    <main style={{ maxWidth: 860, margin: '40px auto', padding: 24 }}>
      <nav>
        <a href="/">Courses</a> - <a href="/videos">Upload video</a>
      </nav>
      <h1>Upload local video</h1>
      <p>Use a Latin filename. Metadata fields and values can be expanded at any time.</p>
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

      <section>
        <h2>Metadata fields</h2>
        <p>
          Metadata fields describe videos and make them easier to filter and recommend. Examples:
          Discipline, Skill level, Position, Technique, or Content focus. Add a field only when the
          required category does not already exist; its selectable values are added while editing a
          video.
        </p>
        <input
          aria-label="New metadata category"
          placeholder="New category, for example Coach"
          value={newFieldName}
          onChange={(event) => setNewFieldName(event.target.value)}
        />
        <button type="button" disabled={!newFieldName.trim()} onClick={() => void addField()}>
          Add field
        </button>
      </section>

      <section aria-labelledby="roadmap-coverage-title">
        <h2 id="roadmap-coverage-title">Roadmap content coverage</h2>
        <p>
          Roadmap topics connect Assessment recommendations with published videos and courses. A
          topic without coverage remains visible to athletes but cannot recommend a lesson yet.
        </p>
        <label>
          New Roadmap topic{' '}
          <input
            maxLength={120}
            placeholder="For example Half Guard"
            value={newRoadmapTopic}
            onChange={(event) => setNewRoadmapTopic(event.target.value)}
          />
        </label>{' '}
        <button
          type="button"
          disabled={!newRoadmapTopic.trim()}
          onClick={() => void addRoadmapTopic()}
        >
          Add Roadmap topic
        </button>
        {roadmapCoverage.length ? (
          <ul>
            {roadmapCoverage.map((topic) => (
              <li key={topic.id}>
                <strong>{topic.name}</strong>: {topic.publishedVideoCount} published video
                {topic.publishedVideoCount === 1 ? '' : 's'}{' '}
                {topic.publishedVideoCount === 0 ? <span>— needs content</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No Roadmap topics available.</p>
        )}
        {roadmapDiagnostics ? (
          <div role="status" aria-label="Roadmap diagnostics">
            <h3>Warnings</h3>
            <ul>
              {roadmapDiagnostics.topics.flatMap((topic) => [
                ...(topic.publishedVideoCount === 0
                  ? [
                      <li key={`${topic.id}-content`}>
                        {topic.name}: no published content
                        {topic.draftVideoCount ? ` (${topic.draftVideoCount} draft)` : ''}
                      </li>,
                    ]
                  : []),
                ...(topic.assessmentMappingCount === 0
                  ? [<li key={`${topic.id}-assessment`}>{topic.name}: not used by Assessment</li>]
                  : []),
              ])}
              {roadmapDiagnostics.unlinkedVideos.map((video) => (
                <li key={video.id}>{video.title}: published without a Roadmap topic</li>
              ))}
            </ul>
            {!roadmapDiagnostics.topics.some(
              (topic) => topic.publishedVideoCount === 0 || topic.assessmentMappingCount === 0,
            ) && !roadmapDiagnostics.unlinkedVideos.length ? (
              <p>No Roadmap connection warnings.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <h2>Videos</h2>
      <ul>
        {videos.map((video) => (
          <li key={video.id} style={{ marginBottom: 20 }}>
            <code>{video.id}</code>{' '}
            <button type="button" onClick={() => void navigator.clipboard.writeText(video.id)}>
              Copy ID
            </button>{' '}
            - {video.title} ({video.published ? 'published' : 'draft'}){' '}
            {!video.published && (
              <button type="button" onClick={() => void publish(video.id)}>
                Publish
              </button>
            )}{' '}
            <button type="button" onClick={() => beginMetadataEdit(video)}>
              Edit metadata
            </button>
            {editingVideoId === video.id && (
              <section style={{ border: '1px solid #ddd', padding: 16, marginTop: 12 }}>
                {fields.map((field) => (
                  <div key={field.id} style={{ marginBottom: 16 }}>
                    {field.key === 'roadmap-topic' ? (
                      <p>
                        <strong>Roadmap connection:</strong> select the Assessment topic this video
                        teaches. Use Add new option only for an approved methodology topic.
                      </p>
                    ) : null}
                    <label>
                      {field.name}
                      <select
                        value={selectedOptions[field.id] ?? ''}
                        onChange={(event) =>
                          setSelectedOptions((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Not selected</option>
                        {field.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input
                      placeholder={`Add value to ${field.name}`}
                      value={newOptions[field.id] ?? ''}
                      onChange={(event) =>
                        setNewOptions((current) => ({
                          ...current,
                          [field.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={!newOptions[field.id]?.trim()}
                      onClick={() => void addOption(field)}
                    >
                      Add new option
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => void saveMetadata()}>
                  Save metadata
                </button>{' '}
                <button type="button" onClick={() => setEditingVideoId('')}>
                  Cancel
                </button>
              </section>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

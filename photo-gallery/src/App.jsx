import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import "./App.css";

const API_URL = "https://api.openverse.org/v1/images/";

function Photo({ photo }) {
  const [likes, setLikes] = useState(0);

  return (
    <div className="photo-row">
      <img
        className="photo-image"
        src={photo.download_url}
        alt={photo.title || "Gallery photo"}
        loading="lazy"
      />

      <div className="photo-info">
        <span className="author">
          Author: {photo.author}
        </span>

        <button
          className="like-button"
          onClick={() => setLikes((count) => count + 1)}
          aria-label={`Like photo. ${likes} likes`}
        >
          <FontAwesomeIcon icon={faThumbsUp} />
          {likes > 0 && <span className="like-count">{likes}</span>}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const sentinelRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPhotos() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}?q=nature&category=photograph&page=${page}&page_size=10`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Could not load photos. Please try again.");
        }

        const data = await response.json();

        const newPhotos = data.results.map((photo) => ({
          id: photo.id,
          title: photo.title,
          author: photo.creator || "Unknown",
          download_url: photo.url || photo.thumbnail,
        }));

        setPhotos((previous) => {
          const existingIds = new Set(previous.map((photo) => photo.id));
          const uniquePhotos = newPhotos.filter(
            (photo) => !existingIds.has(photo.id)
          );

          return [...previous, ...uniquePhotos];
        });

        setHasMore(page < data.page_count && newPhotos.length > 0);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchPhotos();

    return () => controller.abort();
  }, [page, retryCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || loading || !hasMore || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          setPage((currentPage) => currentPage + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loading, hasMore, error, photos.length]);

  return (
    <main className="gallery-container">
      {photos.map((photo) => (
        <Photo key={photo.id} photo={photo} />
      ))}

      {loading && <p className="status-message">Loading photos...</p>}

      {error && (
        <div className="status-message">
          <p>{error}</p>
          <button onClick={() => setRetryCount((count) => count + 1)}>
            Retry
          </button>
        </div>
      )}

      {!hasMore && photos.length > 0 && (
        <p className="status-message">No more photos.</p>
      )}

      <div ref={sentinelRef} className="scroll-sentinel" />
    </main>
  );
}

export default App;
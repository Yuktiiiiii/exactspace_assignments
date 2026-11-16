
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import "./App.css";

const API_URL = "https://picsum.photos/v2/list";

function Photo({ photo }) {
  const [likes, setLikes] = useState(0);

  return (
    <div className="photo-row">
      <img
        className="photo-image"
        src={photo.download_url}
        alt={`Photograph by ${photo.author}`}
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
          type="button"
        >
          <FontAwesomeIcon icon={faThumbsUp} />
          {likes > 0 && (
            <span className="like-count">{likes}</span>
          )}
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

  // Fetch paginated Picsum photos
  useEffect(() => {
    const controller = new AbortController();

    async function fetchPhotos() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}?page=${page}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            "Could not load photos. Please try again."
          );
        }

        const data = await response.json();

        // Stop when the API returns an empty page
        if (!Array.isArray(data) || data.length === 0) {
          setHasMore(false);
          return;
        }

        const newPhotos = data.map((photo) => ({
          id: photo.id,
          author: photo.author,
          download_url: photo.download_url,
        }));

        // Append new photos without duplicates
        setPhotos((previous) => {
          const existingIds = new Set(
            previous.map((photo) => photo.id)
          );

          const uniquePhotos = newPhotos.filter(
            (photo) => !existingIds.has(photo.id)
          );

          return [...previous, ...uniquePhotos];
        });

        setHasMore(newPhotos.length > 0);
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

  // Infinite scrolling
  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || loading || !hasMore || error) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          setPage((currentPage) => currentPage + 1);
        }
      },
      {
        rootMargin: "200px",
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loading, hasMore, error, photos.length]);

  // Retry failed requests
  const handleRetry = () => {
    setRetryCount((count) => count + 1);
  };

  return (
    <main className="gallery-container">
      <h1 className="gallery-heading">Photo gallery</h1>

      {/* Photo List */}
      {photos.map((photo) => (
        <Photo key={photo.id} photo={photo} />
      ))}

      {/* Loading Indicator */}
      {loading && (
        <p className="status-message">
          Loading photos...
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="status-message">
          <p>{error}</p>

          <button onClick={handleRetry} type="button">
            Retry
          </button>
        </div>
      )}

      {/* End of Gallery */}
      {!hasMore && photos.length > 0 && (
        <p className="status-message">
          No more photos.
        </p>
      )}

      {/* Infinite Scroll Trigger */}
      <div
        ref={sentinelRef}
        className="scroll-sentinel"
      />

    </main>
  );
}

export default App;

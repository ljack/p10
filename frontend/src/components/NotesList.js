import React, { useState, useEffect } from 'react';
import './NotesList.css';

const NotesList = ({ onEditNote, onCreateNew }) => {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredNotes(notes);
    } else {
      handleSearch(searchQuery);
    }
  }, [notes, searchQuery]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/notes');
      const data = await response.json();
      
      if (data.success) {
        const fetchedNotes = data.data || [];
        setNotes(fetchedNotes);
        setFilteredNotes(fetchedNotes);
      } else {
        throw new Error('Failed to fetch notes');
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getContentPreview = (content, maxLength = 120) => {
    if (!content) return 'No content';
    
    // Strip HTML tags if any and limit length
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setFilteredNotes(notes);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await fetch(`/api/notes/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setFilteredNotes(data.data || []);
      } else {
        throw new Error('Search failed');
      }
    } catch (err) {
      console.error('Error searching notes:', err);
      // Fallback to client-side search
      const clientSearchResults = notes.filter(note => 
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredNotes(clientSearchResults);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredNotes(notes);
  };

  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation(); // Prevent triggering the edit action
    
    const noteToDelete = notes.find(note => note.id === noteId);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${noteToDelete?.title || 'this note'}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove the note from both notes and filteredNotes
        const updatedNotes = notes.filter(note => note.id !== noteId);
        setNotes(updatedNotes);
        setFilteredNotes(filteredNotes.filter(note => note.id !== noteId));
      } else {
        throw new Error(data.message || 'Failed to delete note');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="notes-list">
        <div className="notes-list-header">
          <h2>Your Notes</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notes-list">
        <div className="notes-list-header">
          <h2>Your Notes</h2>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={fetchNotes} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-list">
      <div className="notes-list-header">
        <h2>Your Notes</h2>
        <div className="notes-count">
          {searchQuery ? (
            `${filteredNotes.length} of ${notes.length} notes`
          ) : (
            `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
          )}
        </div>
      </div>

      <div className="search-section">
        <div className="search-input-container">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            className="search-input"
          />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className="clear-search-button"
              title="Clear search"
            >
              ✕
            </button>
          )}
          {searchLoading && (
            <div className="search-loading">
              <div className="search-spinner"></div>
            </div>
          )}
        </div>
        {searchQuery && (
          <div className="search-info">
            {filteredNotes.length === 0 ? (
              <span className="no-results">No notes found for "{searchQuery}"</span>
            ) : (
              <span className="search-results">
                Found {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </span>
            )}
          </div>
        )}
      </div>

      {filteredNotes.length === 0 && notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No notes yet</h3>
          <p>Start by creating your first note!</p>
          {onCreateNew && (
            <button onClick={onCreateNew} className="create-first-note-button">
              ✨ Create Your First Note
            </button>
          )}
        </div>
      ) : filteredNotes.length === 0 && searchQuery ? (
        <div className="no-search-results">
          <div className="no-results-icon">🔍</div>
          <h3>No notes found</h3>
          <p>No notes match "{searchQuery}". Try a different search term.</p>
          <button onClick={clearSearch} className="clear-search-results-button">
            Clear Search
          </button>
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className="note-card"
              onClick={() => onEditNote && onEditNote(note.id)}
            >
              <div className="note-card-header">
                <h3 className="note-title">
                  {note.title || 'Untitled Note'}
                </h3>
                <div className="note-card-actions">
                  <span className="note-date">
                    {formatDate(note.createdAt)}
                  </span>
                  <button
                    className="delete-note-button"
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    title="Delete note"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="note-content-preview">
                {getContentPreview(note.content)}
              </div>
              
              <div className="note-card-footer">
                <span className="note-updated">
                  {note.updatedAt && note.updatedAt !== note.createdAt
                    ? `Updated ${formatDate(note.updatedAt)}`
                    : ''
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesList;
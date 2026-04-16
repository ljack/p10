import React, { useState, useEffect } from 'react';
import './NoteEditor.css';

const NoteEditor = ({ noteId, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalNote, setOriginalNote] = useState(null);

  useEffect(() => {
    if (noteId) {
      fetchNote(noteId);
      setIsEditing(true);
    } else {
      resetForm();
      setIsEditing(false);
    }
  }, [noteId]);

  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setOriginalNote(null);
    setError(null);
  };

  const fetchNote = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/notes/${id}`);
      const data = await response.json();
      
      if (data.success) {
        const note = data.data;
        setFormData({
          title: note.title || '',
          content: note.content || ''
        });
        setOriginalNote(note);
      } else {
        throw new Error('Failed to fetch note');
      }
    } catch (err) {
      console.error('Error fetching note:', err);
      setError('Failed to load note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      setError('Please enter a title for your note.');
      return;
    }

    if (!formData.content.trim()) {
      setError('Please enter some content for your note.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = isEditing ? `/api/notes/${noteId}` : '/api/notes';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form if creating new note
        if (!isEditing) {
          resetForm();
        }
        
        // Call onSave callback
        if (onSave) {
          onSave(data.data);
        }
      } else {
        throw new Error(data.message || 'Failed to save note');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !noteId) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${originalNote?.title || 'this note'}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        if (onDelete) {
          onDelete(noteId);
        }
      } else {
        throw new Error(data.message || 'Failed to delete note');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      // Restore original values if editing
      if (originalNote) {
        setFormData({
          title: originalNote.title || '',
          content: originalNote.content || ''
        });
      }
    } else {
      // Clear form if creating new note
      resetForm();
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  const hasChanges = () => {
    if (!isEditing) {
      return formData.title.trim() !== '' || formData.content.trim() !== '';
    }
    
    if (!originalNote) return false;
    
    return (
      formData.title.trim() !== (originalNote.title || '').trim() ||
      formData.content.trim() !== (originalNote.content || '').trim()
    );
  };

  if (loading && isEditing && !originalNote) {
    return (
      <div className="note-editor">
        <div className="note-editor-loading">
          <div className="loading-spinner"></div>
          <p>Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="note-editor">
      <div className="note-editor-header">
        <h2>
          {isEditing ? 'Edit Note' : 'Create New Note'}
        </h2>
        {isEditing && originalNote && (
          <div className="note-editor-meta">
            <span>Created: {new Date(originalNote.createdAt).toLocaleDateString()}</span>
            {originalNote.updatedAt !== originalNote.createdAt && (
              <span>Last updated: {new Date(originalNote.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="note-editor-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="note-editor-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter a title for your note..."
            maxLength={200}
            disabled={loading}
            className="title-input"
          />
          <div className="character-count">
            {formData.title.length}/200
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder="Start writing your note here..."
            rows={12}
            disabled={loading}
            className="content-textarea"
          />
          <div className="character-count">
            {formData.content.length} characters
          </div>
        </div>

        <div className="note-editor-actions">
          <div className="primary-actions">
            <button
              type="submit"
              disabled={loading || !hasChanges()}
              className="save-button"
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  {isEditing ? '💾 Update Note' : '✨ Create Note'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>

          {isEditing && (
            <div className="secondary-actions">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="delete-button"
              >
                🗑️ Delete Note
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default NoteEditor;
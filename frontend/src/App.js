import React, { useState } from 'react';
import './App.css';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';

function App() {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [refreshList, setRefreshList] = useState(0);

  const handleCreateNew = () => {
    setSelectedNoteId(null);
    setCurrentView('create');
  };

  const handleEditNote = (noteId) => {
    setSelectedNoteId(noteId);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedNoteId(null);
    // Force refresh of notes list
    setRefreshList(prev => prev + 1);
  };

  const handleNoteSaved = (savedNote) => {
    console.log('Note saved:', savedNote);
    handleBackToList();
  };

  const handleNoteDeleted = (deletedNoteId) => {
    console.log('Note deleted:', deletedNoteId);
    handleBackToList();
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
        return (
          <NoteEditor
            onSave={handleNoteSaved}
            onCancel={handleBackToList}
          />
        );
      case 'edit':
        return (
          <NoteEditor
            noteId={selectedNoteId}
            onSave={handleNoteSaved}
            onCancel={handleBackToList}
            onDelete={handleNoteDeleted}
          />
        );
      case 'list':
      default:
        return (
          <NotesList
            key={refreshList} // Force re-render when refreshList changes
            onEditNote={handleEditNote}
            onCreateNew={handleCreateNew}
          />
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <h1 onClick={handleBackToList} className={currentView !== 'list' ? 'clickable' : ''}>
              Notes App
            </h1>
            <p>Organize your thoughts and ideas</p>
          </div>
          
          {currentView === 'list' && (
            <div className="header-actions">
              <button 
                onClick={handleCreateNew}
                className="create-note-button"
              >
                ✨ New Note
              </button>
            </div>
          )}

          {currentView !== 'list' && (
            <div className="header-navigation">
              <button 
                onClick={handleBackToList}
                className="back-button"
              >
                ← Back to Notes
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="App-main">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
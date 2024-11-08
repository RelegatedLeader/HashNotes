import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/new-note' element={<NewNote />} />
        <Route path='/notes/:hash' element={<Notes />} />
      </Routes>
    </Router>
  );
}
//added this for randomness

function Home() {
  const [hash, setHash] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (hash.trim()) {
      navigate(`/notes/${hash}`);
    }
  };

  return (
    <div>
      <h1>HashNotes</h1>
      <input
        type='text'
        placeholder='Enter your unique hash'
        value={hash}
        onChange={(e) => setHash(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => navigate('/new-note')}>I'm New Here</button>
    </div>
  );
}

function NewNote() {
  const [note, setNote] = useState({ title: '', text: '' });
  const navigate = useNavigate();

  const handleSaveFirstNote = () => {
    axios
      .post(`${apiUrl}/new-user-note`, note)
      .then((res) => {
        if (res.data && res.data.hash) {
          alert(
            `Your unique hash is: ${res.data.hash}. Save it to access your notes.`
          );
          localStorage.setItem('userHash', res.data.hash);
          navigate(`/notes/${res.data.hash}`);
        } else {
          alert('Error: No hash returned from the server.');
        }
      })
      .catch((err) => {
        console.error('Failed to save note:', err);
        alert('Failed to save note. Please try again.');
      });
  };

  return (
    <div>
      <h2>Create Your First Note</h2>
      <input
        type='text'
        placeholder='Title'
        value={note.title}
        onChange={(e) => setNote({ ...note, title: e.target.value })}
      />
      <textarea
        placeholder='Text'
        value={note.text}
        onChange={(e) => setNote({ ...note, text: e.target.value })}
      />
      <button onClick={handleSaveFirstNote}>Save Note & Get Hash</button>
    </div>
  );
}

function Notes() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ title: '', text: '' });
  const { hash } = useParams();

  useEffect(() => {
    axios
      .get(`${apiUrl}/notes/${hash}`)
      .then((res) => {
        if (res.data && res.data.notes) {
          setNotes(res.data.notes);
        } else {
          alert('No notes found for this hash.');
        }
      })
      .catch((err) => console.error('Failed to fetch notes:', err));
  }, [hash]);

  const handleAddNote = () => {
    axios
      .post(`${apiUrl}/notes`, { ...newNote, hash })
      .then((res) => {
        setNotes([...notes, { id: res.data.id, ...newNote }]);
        setNewNote({ title: '', text: '' });
      })
      .catch((err) => console.error('Failed to add note:', err));
  };

  return (
    <div>
      <h2>Your Notes</h2>
      <div>
        <input
          type='text'
          placeholder='Title'
          value={newNote.title}
          onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
        />
        <textarea
          placeholder='Text'
          value={newNote.text}
          onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
        />
        <button onClick={handleAddNote}>Add Note</button>
      </div>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <h3>{note.title}</h3>
            <p>{note.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

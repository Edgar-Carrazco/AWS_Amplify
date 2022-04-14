import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import { API, Storage } from 'aws-amplify';
import Amplify, { Auth } from 'aws-amplify';
import awsconfig from './aws-exports';
import { DataStore } from '@aws-amplify/datastore';
import { Note } from './models';

const initialFormState = { name: '', description: '' }

const myAppConfig = {
	'aws_appsync_graphqlEndpoint': 'https://ztw43cbf7jaz5o5yizz26n7zze.appsync-api.us-east-1.amazonaws.com/graphql',
	'aws_appsync_region': 'us-east-1',
	'aws_appsync_authenticationType': 'API_KEY',
	'aws_appsync_apiKey': 'da2-zbzmo4k4mvdxnetrybw2m6jlr4',
}

function App() {
	
	const [notes, setNotes] = useState([]);
	const [formData, setFormData] = useState(initialFormState);

	useEffect(() => {
		fetchNotes();
	}, []);



	async function fetchNotes() {
		const apiData = await API.graphql({ query: listNotes });
		const notesFromAPI = apiData.data.listNotes.items;
		await Promise.all(notesFromAPI.map(async note => {
			if (note.image) {
				const image = await Storage.get(note.image);
				note.image = image;
			}
			return note;
		}))
		setNotes(apiData.data.listNotes.items);
	}

	async function createNote() {
		if (!formData.name || !formData.description) return;
		await API.graphql({ query: createNoteMutation, variables: { input: formData } });
		if (formData.image) {
			const image = await Storage.get(formData.image);
			formData.image = image;
		}
		setNotes([ ...notes, formData ]);
		setFormData(initialFormState);
	}

	async function deleteNote({ id }) {
		const newNotesArray = notes.filter(note => note.id !== id);
		setNotes(newNotesArray);
		await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
	}

	async function onChange(e) {
		if (!e.target.files[0]) return
		const file = e.target.files[0];
		setFormData({ ...formData, image: file.name });
		await Storage.put(file.name, file);
		fetchNotes();
	}

	return (
		<div className="App">
			<h1>My Notes App</h1>
			<input
				onChange={e => setFormData({ ...formData, 'name': e.target.value})}
				placeholder="Note name"
				value={formData.name}
			/>
			<input
				onChange={e => setFormData({ ...formData, 'description': e.target.value})}
				placeholder="Note description"
				value={formData.description}
			/>
			<button onClick={createNote}>Create Note</button>
			<input
				type="file"
				onChange={onChange}
			/>
			<div style={{marginBottom: 30}}>
				{
					notes.map(note => (
						<div key={note.id || note.name}>
							<h2>{note.name}</h2>
							<p>{note.description}</p>
							<button onClick={() => deleteNote(note)}>Delete note</button>
							{
								note.image && <img src={note.image} style={{width: 400}} />
							}
						</div>
					))
				}
			</div>
			<AmplifySignOut />
		</div>

	);
}

export default withAuthenticator(App);

Amplify.configure(awsconfig);	
Amplify.configure(myAppConfig)
Auth.configure(awsconfig);
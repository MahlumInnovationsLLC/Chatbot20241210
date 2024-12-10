import React, { useState } from 'react';
import axios from 'axios';

export default function FileUpload() {
    const [file, setFile] = useState(null);
    const [uploadMsg, setUploadMsg] = useState('');

    const handleFileChange = e => {
        setFile(e.target.files[0]);
    };

    const uploadFile = async () => {
        if (!file) {
            setUploadMsg('No file selected.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadMsg(`File uploaded: ${res.data.file.name}`);
            setFile(null);
        } catch (e) {
            console.error(e);
            setUploadMsg('File upload failed.');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-md flex flex-col items-center space-y-2">
            <input type="file" onChange={handleFileChange} className="text-white" />
            <button onClick={uploadFile} className="bg-futuristic-accent px-4 py-2 rounded text-white">Upload</button>
            {uploadMsg && <p>{uploadMsg}</p>}
        </div>
    );
}
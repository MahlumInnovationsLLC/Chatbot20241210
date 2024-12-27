import React, { useState } from 'react';
import axios from 'axios';

/**
 * Example FileUpload component with a "hidden timestamp fix":
 * We rename the file on the client side so that if user uploads
 * "myfile.pdf" multiple times, each upload has a unique name.
 */
export default function FileUpload() {
    const [file, setFile] = useState(null);
    const [uploadMsg, setUploadMsg] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setUploadMsg('');
    };

    const uploadFile = async () => {
        if (!file) {
            setUploadMsg('No file selected.');
            return;
        }

        try {
            // Let's rename the file with an invisible timestamp fix:
            // e.g. "myfile.pdf" -> "myfile_16732123456.pdf"
            const timestamp = Date.now();
            const originalName = file.name;
            const dotIndex = originalName.lastIndexOf('.');
            let baseName = originalName;
            let extension = '';
            if (dotIndex !== -1) {
                baseName = originalName.substring(0, dotIndex);
                extension = originalName.substring(dotIndex);
            }

            // e.g. "myFile" + "_" + "timestamp" + ".pdf"
            const newName = `${baseName}_${timestamp}${extension}`;

            // Create a new File object with that name
            const renamedFile = new File([file], newName, { type: file.type });

            const formData = new FormData();
            formData.append('file', renamedFile, renamedFile.name);

            // If you want to pass additional fields (like a userMessage):
            // formData.append('userMessage', 'some text...');

            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
            const res = await axios.post(`${BACKEND_URL}/chat`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUploadMsg(`File uploaded successfully. Server reply: ${res.data.reply}`);
            setFile(null);
        } catch (e) {
            console.error(e);
            setUploadMsg('File upload failed.');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-md flex flex-col items-center space-y-2">
            <input type="file" onChange={handleFileChange} className="text-white" />
            <button onClick={uploadFile} className="bg-futuristic-accent px-4 py-2 rounded text-white">
                Upload
            </button>
            {uploadMsg && <p>{uploadMsg}</p>}
        </div>
    );
}
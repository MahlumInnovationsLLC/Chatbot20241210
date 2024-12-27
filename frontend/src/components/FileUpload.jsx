import React, { useState } from 'react';
import axios from 'axios';

/**
 * Example FileUpload component with multiple files and a "hidden timestamp fix":
 * 1) We allow multiple files using <input multiple>.
 * 2) Each file is renamed on the client side so that if user re-uploads
 *    "myfile.pdf" multiple times, each upload has a unique name.
 */
export default function FileUpload() {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadMsg, setUploadMsg] = useState('');

    const handleFileChange = (e) => {
        // `e.target.files` is a FileList, convert to an array
        const filesArray = Array.from(e.target.files || []);
        setSelectedFiles(filesArray);
        setUploadMsg('');
    };

    const uploadFiles = async () => {
        if (!selectedFiles || selectedFiles.length === 0) {
            setUploadMsg('No files selected.');
            return;
        }

        try {
            const formData = new FormData();

            // For each file, rename and append to formData
            selectedFiles.forEach((file) => {
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

                // Create a new File object
                const renamedFile = new File([file], newName, { type: file.type });
                formData.append('file', renamedFile, renamedFile.name);
            });

            // If you want to pass additional fields (like a userMessage):
            // formData.append('userMessage', 'some optional text...');

            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
            const res = await axios.post(`${BACKEND_URL}/chat`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setUploadMsg(`Files uploaded successfully. Server reply: ${res.data.reply}`);
            // Clear the selected files
            setSelectedFiles([]);
        } catch (e) {
            console.error(e);
            setUploadMsg('File upload failed.');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-md flex flex-col items-center space-y-2">
            <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="text-white"
            />
            <button
                onClick={uploadFiles}
                className="bg-futuristic-accent px-4 py-2 rounded text-white"
            >
                Upload
            </button>
            {uploadMsg && <p>{uploadMsg}</p>}
            {selectedFiles.length > 0 && (
                <ul className="text-white text-sm mt-2 list-disc">
                    {selectedFiles.map((f, idx) => (
                        <li key={idx}>{f.name}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
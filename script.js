document.addEventListener('DOMContentLoaded', function () {
    // Getting HTML elements by their ID
    const videoInput = document.getElementById('video-input');
    const videoWrapper = document.getElementById('video-wrapper');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const annotationInput = document.getElementById('annotation');
    const annotationList = document.getElementById('annotations');
    const startTimeBtn = document.getElementById('start-time-btn');
    const endTimeBtn = document.getElementById('end-time-btn');
    const downloadTxtBtn = document.getElementById('download-annotations');
    const downloadJsonBtn = document.getElementById('download-annotations-json');
    const loadInput = document.getElementById('load-annotations');
    const toggleSpeedBtn = document.getElementById('toggle-speed');

    // Declaring variables
    let videoElement;
    let currentVideoTitle = '';
    let annotations = [];
    let isSpeedToggled = false;

    // Defining colors for different types of annotations
    const annotationColors = {
        'Przygotowanie komórki jajowej': 'red',
        'Pobranie plemnika': 'blue',
        'Penetracja osłony przejrzystej i błony komórkowej': 'green',
        'Iniekcja plemnika': 'yellow',
        'Wycofanie mikropipety': 'purple',
        'Stabilizacja komórki jajowej po iniekcji': 'orange'
    };

    // Handling video file change event
    videoInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.type.split('/')[1];
            if (fileType !== 'mp4') {
                alert('Please upload the video in MP4 format.');
                return;
            }

            currentVideoTitle = file.name;

            // Creating a URL for the selected video file
            const videoURL = URL.createObjectURL(file);
            videoElement = document.createElement('video');
            videoElement.src = videoURL;
            videoElement.controls = true;
            videoWrapper.innerHTML = '';
            videoWrapper.appendChild(videoElement);

            // Clearing time fields and annotations
            startTimeInput.value = '';
            endTimeInput.value = '';

            annotations = [];
            annotationList.innerHTML = '';
            updateProgressMarkers();

            // Updating video progress markers
            videoElement.addEventListener('timeupdate', updateProgressMarkers);
        }
    });

    // Handling start time button click
    startTimeBtn.addEventListener('click', function () {
        if (videoElement) {
            startTimeInput.value = formatTime(videoElement.currentTime);
        } else {
            alert('Load the video first.');
        }
    });

    // Handling end time button click
    endTimeBtn.addEventListener('click', function () {
        if (videoElement) {
            endTimeInput.value = formatTime(videoElement.currentTime);
            addAnnotation();
        } else {
            alert('Load the video first.');
        }
    });

    // Handling speed toggle button click
    toggleSpeedBtn.addEventListener('click', function () {
        if (videoElement) {
            isSpeedToggled = !isSpeedToggled;
            videoElement.playbackRate = isSpeedToggled ? 0.5 : 1.0;
        }
    });

    // Function to add annotation to the list
    function addAnnotation() {
        const startTime = parseTime(startTimeInput.value);
        const endTime = parseTime(endTimeInput.value);
        const annotationText = annotationInput.value;

        if (startTime < endTime && isTimeSlotAvailable(startTime, endTime)) {
            const annotationItem = document.createElement('li');
            annotationItem.classList.add('annotation-item');
            annotationItem.innerHTML = `<span><strong>${formatTime(startTime)} - ${formatTime(endTime)} (${currentVideoTitle}):</strong> ${annotationText}</span> <button class="remove-annotation">X</button>`;
            annotationItem.dataset.startTime = startTime;
            annotationItem.dataset.endTime = endTime;

            // Adding annotation removal handling
            const removeBtn = annotationItem.querySelector('.remove-annotation');
            removeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                removeAnnotation(annotationItem, startTime, endTime);
            });

            // Adding video playback handling from the start time of the annotation
            annotationItem.addEventListener('click', function () {
                videoElement.currentTime = startTime;
                videoElement.play();
                const pauseVideo = () => {
                    if (videoElement.currentTime >= endTime) {
                        videoElement.pause();
                        videoElement.removeEventListener('timeupdate', pauseVideo);
                    }
                };
                videoElement.addEventListener('timeupdate', pauseVideo);
            });

            annotationList.appendChild(annotationItem);

            annotations.push({ startTime, endTime, annotationText });

            startTimeInput.value = '';
            endTimeInput.value = '';

            updateProgressMarkers();
        } else {
            alert('Incorrect time range or overlapping annotation.');
            startTimeInput.value = '';
            endTimeInput.value = '';
        }
    }

    // Function to check the availability of the time slot for a new annotation
    function isTimeSlotAvailable(startTime, endTime) {
        return !annotations.some(annotation => 
            (startTime < annotation.endTime && endTime > annotation.startTime)
        );
    }

    // Function to remove an annotation
    function removeAnnotation(annotationItem, startTime, endTime) {
        annotationList.removeChild(annotationItem);
        annotations = annotations.filter(annotation => annotation.startTime !== startTime || annotation.endTime !== endTime);
        updateProgressMarkers();
    }

    // Function to format time into minutes, seconds, and centiseconds
    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const centiseconds = Math.floor((time % 1) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }

    // Function to parse time in the format "mm:ss.ss" into seconds
    function parseTime(timeString) {
        const [minutes, rest] = timeString.split(':');
        const [seconds, centiseconds] = rest.split('.');
        return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100;
    }

    // Function to update video progress markers
    function updateProgressMarkers() {
        if (!videoElement) return;

        const duration = videoElement.duration;
        progressBar.innerHTML = '';

        annotations.forEach(annotation => {
            const startRatio = annotation.startTime / duration;
            const endRatio = annotation.endTime / duration;
            const marker = document.createElement('div');
            marker.classList.add('annotation-marker');
            marker.style.left = `${startRatio * 100}%`;
            marker.style.width = `${(endRatio - startRatio) * 100}%`;
            marker.style.backgroundColor = annotationColors[annotation.annotationText];
            progressBar.appendChild(marker);
        });
    }

    // Handling TXT annotations download button click
    downloadTxtBtn.addEventListener('click', function () {
        if (annotations.length > 0) {
            const fileName = `${currentVideoTitle} - ADNOTACJE.txt`;
            const content = annotations.map(annotation => {
                const annotationText = annotationList.querySelector(`[data-start-time="${annotation.startTime}"] span`).innerText;
                return `${annotationText}`;
            }).join('\n');
            downloadFile(fileName, content);
        } else {
            alert('No annotations to download.');
        }
    });

    // Handling JSON annotations download button click
    downloadJsonBtn.addEventListener('click', function () {
        if (annotations.length > 0) {
            const fileName = `${currentVideoTitle} - ADNOTACJE.json`;
            const content = JSON.stringify(annotations, null, 2);
            downloadFile(fileName, content);
        } else {
            alert('No annotations to download.');
        }
    });

    // Handling annotations file change event
    loadInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!videoElement) {
            alert('Load the video first.');
            loadInput.value = '';
            return;
        }
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                if (file.name.endsWith('.txt')) {
                    loadTxtAnnotations(content);
                } else if (file.name.endsWith('.json')) {
                    loadJsonAnnotations(content);
                } else {
                    alert('Unsupported file format.');
                }
            };
            reader.readAsText(file);
        }
        loadInput.value = '';
    });

    function loadTxtAnnotations(content) {
        annotations = [];
        annotationList.innerHTML = '';

        const lines = content.split('\n');
        lines.forEach(line => {
            const match = line.match(/(\d+:\d+\.\d+)\s*-\s*(\d+:\d+\.\d+)\s*\(([^)]+)\):\s*(.*)/);
            if (match) {
                const [_, start, end, title, text] = match;
                if (title === currentVideoTitle) {
                    const startTime = parseTime(start);
                    const endTime = parseTime(end);
                    if (isTimeSlotAvailable(startTime, endTime)) {
                        const annotationItem = document.createElement('li');
                        annotationItem.classList.add('annotation-item');
                        annotationItem.innerHTML = `<span><strong>${start} - ${end} (${title}):</strong> ${text}</span> <button class="remove-annotation">X</button>`;
                        annotationItem.dataset.startTime = startTime;
                        annotationItem.dataset.endTime = endTime;
                        
                        const removeBtn = annotationItem.querySelector('.remove-annotation');
                        removeBtn.addEventListener('click', function (e) {
                            e.stopPropagation();
                            removeAnnotation(annotationItem, startTime, endTime);
                        });

                        annotationItem.addEventListener('click', function () {
                            videoElement.currentTime = startTime;
                            videoElement.play();
                            const pauseVideo = () => {
                                if (videoElement.currentTime >= endTime) {
                                    videoElement.pause();
                                    videoElement.removeEventListener('timeupdate', pauseVideo);
                                }
                            };
                            videoElement.addEventListener('timeupdate', pauseVideo);
                        });

                        annotationList.appendChild(annotationItem);

                        annotations.push({ startTime, endTime, annotationText: text });
                    }
                }
            }
        });

        updateProgressMarkers();
    }

    function loadJsonAnnotations(content) {
        const jsonAnnotations = JSON.parse(content);
        annotations = [];
        annotationList.innerHTML = '';

        jsonAnnotations.forEach(annotation => {
            if (isTimeSlotAvailable(annotation.startTime, annotation.endTime)) {
                const annotationItem = document.createElement('li');
                annotationItem.classList.add('annotation-item');
                annotationItem.innerHTML = `<span><strong>${formatTime(annotation.startTime)} - ${formatTime(annotation.endTime)} (${currentVideoTitle}):</strong> ${annotation.annotationText}</span> <button class="remove-annotation">X</button>`;
                annotationItem.dataset.startTime = annotation.startTime;
                annotationItem.dataset.endTime = annotation.endTime;

                // Adding annotation removal handling
                const removeBtn = annotationItem.querySelector('.remove-annotation');
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    removeAnnotation(annotationItem, annotation.startTime, annotation.endTime);
                });

                // Adding video playback handling from the start time of the annotation
                annotationItem.addEventListener('click', function () {
                    videoElement.currentTime = annotation.startTime;
                    videoElement.play();
                    const pauseVideo = () => {
                        if (videoElement.currentTime >= annotation.endTime) {
                            videoElement.pause();
                            videoElement.removeEventListener('timeupdate', pauseVideo);
                        }
                    };
                    videoElement.addEventListener('timeupdate', pauseVideo);
                });

                annotationList.appendChild(annotationItem);

                annotations.push({ startTime: annotation.startTime, endTime: annotation.endTime, annotationText: annotation.annotationText });
            }
        });

        updateProgressMarkers();
    }

    // Function to download file
    function downloadFile(fileName, content) {
        const a = document.createElement('a');
        const blob = new Blob([content], { type: 'text/plain' });
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
});

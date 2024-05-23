document.addEventListener('DOMContentLoaded', function () {
    const videoInput = document.getElementById('video-input');
    const videoWrapper = document.getElementById('video-wrapper');
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

    let videoElement;
    let currentVideoTitle = '';
    let annotations = [];
    let isSpeedToggled = false;

    videoInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.type.split('/')[1];
            if (fileType !== 'mp4') {
                alert('Please upload a video in MP4 format.');
                return;
            }

            currentVideoTitle = file.name;

            const videoURL = URL.createObjectURL(file);
            videoElement = document.createElement('video');
            videoElement.src = videoURL;
            videoElement.controls = true;
            videoWrapper.innerHTML = '';
            videoWrapper.appendChild(videoElement);

            // Clear time inputs
            startTimeInput.value = '';
            endTimeInput.value = '';

            // Clear annotations
            annotations = [];
            annotationList.innerHTML = '';
        }
    });

    startTimeBtn.addEventListener('click', function () {
        if (videoElement) {
            startTimeInput.value = formatTime(videoElement.currentTime);
        } else {
            alert('Please load a video first.');
        }
    });

    endTimeBtn.addEventListener('click', function () {
        if (videoElement) {
            endTimeInput.value = formatTime(videoElement.currentTime);
            addAnnotation();
        } else {
            alert('Please load a video first.');
        }
    });

    toggleSpeedBtn.addEventListener('click', function () {
        if (videoElement) {
            isSpeedToggled = !isSpeedToggled;
            videoElement.playbackRate = isSpeedToggled ? 0.5 : 1.0;
        }
    });

    // Add annotation to list
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

            annotations.push({ startTime, endTime, annotationText });

            // Clear inputs
            startTimeInput.value = '';
            endTimeInput.value = '';
        } else {
            alert('Invalid time range or overlapping annotation.');
            startTimeInput.value = '';
            endTimeInput.value = '';
        }
    }

    // Check if the time slot is available (no overlap with existing annotations)
    function isTimeSlotAvailable(startTime, endTime) {
        return !annotations.some(annotation => 
            (startTime < annotation.endTime && endTime > annotation.startTime)
        );
    }

    // Remove annotation from the list and annotations array
    function removeAnnotation(annotationItem, startTime, endTime) {
        annotationList.removeChild(annotationItem);
        annotations = annotations.filter(annotation => annotation.startTime !== startTime || annotation.endTime !== endTime);
    }

    // Format time in MM:SS.SS format
    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const centiseconds = Math.floor((time % 1) * 100);
        return `${padZero(minutes)}:${padZero(seconds)}.${padZero(centiseconds, 2)}`;
    }

    // Parse time from MM:SS.SS format to seconds
    function parseTime(timeString) {
        const [minutes, secondsWithCentiseconds] = timeString.split(':');
        const [seconds, centiseconds] = secondsWithCentiseconds.split('.');
        return parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + (parseInt(centiseconds, 10) / 100);
    }

    // Add leading zero if needed
    function padZero(num, length = 2) {
        return num.toString().padStart(length, '0');
    }

    // Download annotations as .txt file
    downloadTxtBtn.addEventListener('click', function () {
        if (annotations.length > 0) {
            const fileName = `${currentVideoTitle} - ADNOTACJE.txt`;
            let content = annotations.map(annotation => {
                const annotationText = annotationList.querySelector(`[data-start-time="${annotation.startTime}"] span`).innerText;
                return `${annotationText}`;
            }).join('\n');
            downloadFile(fileName, content);
        } else {
            alert('No annotations to download.');
        }
    });

    // Download annotations as .json file
    downloadJsonBtn.addEventListener('click', function () {
        if (annotations.length > 0) {
            const fileName = `${currentVideoTitle} - ADNOTACJE.json`;
            const content = JSON.stringify(annotations, null, 2);
            downloadFile(fileName, content);
        } else {
            alert('No annotations to download.');
        }
    });

    // Load annotations from .txt or .json file
    loadInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!videoElement) {
            alert('Please load a video first.');
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

    // Load TXT annotations into the list
    function loadTxtAnnotations(content) {
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
    }

    // Load JSON annotations into the list
    function loadJsonAnnotations(content) {
        try {
            const jsonAnnotations = JSON.parse(content);
            if (Array.isArray(jsonAnnotations)) {
                jsonAnnotations.forEach(annotation => {
                    const { startTime, endTime, annotationText } = annotation;
                    if (startTime && endTime && annotationText && isTimeSlotAvailable(startTime, endTime)) {
                        const annotationItem = document.createElement('li');
                        annotationItem.classList.add('annotation-item');
                        annotationItem.innerHTML = `<span><strong>${formatTime(startTime)} - ${formatTime(endTime)} (${currentVideoTitle}):</strong> ${annotationText}</span> <button class="remove-annotation">X</button>`;
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
                        annotations.push({ startTime, endTime, annotationText });
                    }
                });
            } else {
                throw new Error('Invalid JSON format.');
            }
        } catch (error) {
            alert('Failed to load JSON annotations: ' + error.message);
        }
    }

    // Download file utility function
    function downloadFile(fileName, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }
});

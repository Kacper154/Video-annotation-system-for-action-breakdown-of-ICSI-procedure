document.addEventListener('DOMContentLoaded', function () {
    const videoInput = document.getElementById('video-input');
    const videoWrapper = document.getElementById('video-wrapper');
    const timeInput = document.getElementById('time');
    const annotationInput = document.getElementById('annotation');
    const annotationList = document.getElementById('annotations');
    const addAnnotationBtn = document.getElementById('add-annotation');

    let videoElement;
    let currentVideoTitle = '';

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

            // Clear time input
            timeInput.value = '';

            // Update time input with current video time
            videoElement.addEventListener('timeupdate', function () {
                timeInput.value = formatTime(videoElement.currentTime);
            });
        }
    });

    // Add annotation to list
    addAnnotationBtn.addEventListener('click', function () {
        const time = timeInput.value;
        const annotationText = annotationInput.value;

        if (time && annotationText) {
            const annotationItem = document.createElement('li');
            annotationItem.classList.add('annotation-item');
            annotationItem.innerHTML = `<strong>${time} (${currentVideoTitle}):</strong> ${annotationText}`;
            annotationList.appendChild(annotationItem);
            annotationInput.value = '';
        } else {
            alert('Please enter both time and annotation text.');
        }
    });

    // Format time in MM:SS format
    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${padZero(minutes)}:${padZero(seconds)}`;
    }

    // Add leading zero if needed
    function padZero(num) {
        return num < 10 ? '0' + num : num;
    }
});

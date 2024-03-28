import { timeSaver } from "./utility.js"

let currentUrlList = undefined;
function displayTargetUrls(urlList, onRemove) {
    var arrayContainer = document.getElementById("currentUrls");

    // Clear any existing content in the container
    arrayContainer.innerHTML = "";

    var ul = document.createElement("ul");
    
    urlList.forEach(
        function(item, index)
        {
            var li = document.createElement("li");
            li.textContent = item + '\n';
            ul.appendChild(li);
            var removeButton = document.createElement("button");
            removeButton.innerText = "remove";
            removeButton.addEventListener('click', (ev) => onRemove(index));
            li.appendChild(removeButton);
        });

    // Append the unordered list to the container
    arrayContainer.appendChild(ul);
}

function onRemove(index)
{
    currentUrlList.splice(index, 1);
    displayTargetUrls(currentUrlList, onRemove);
}

function updateUrls()
{
    var inputUrl = document.getElementById('addUrl');
    
    if(inputUrl.value != "" && currentUrlList.indexOf(inputUrl.value) == -1)
    {
        currentUrlList.push(inputUrl.value);
        displayTargetUrls(currentUrlList, onRemove);
    }

    inputUrl.value = "";
}

function updateAlarmPeriod()
{
    var input = document.getElementById('websiteInput').value;
    var timeThreshold = document.getElementById('timeThresholdInput').value;
    chrome.storage.sync.set({
        'website': input,
        'timeThreshold': timeThreshold
    }, function () {
        console.log("alarm period updated");
    });
}

let dataPromise = undefined;
async function updateInfoString()
{
    if(dataPromise !== undefined)
        await dataPromise;
    var targetElement = document.getElementById('currentInformation');
    dataPromise = timeSaver.getAlarmData();
    targetElement.innerText = timeSaver.dataToInfoString(await dataPromise);
    dataPromise = undefined;
}

(async function()
{
    document.getElementById("updateUrls").addEventListener("click", updateUrls);
    document.getElementById("updateAlarmPeriod").addEventListener("click", updateAlarmPeriod);
    
    currentUrlList = await timeSaver.getUrlList();
    // Call the function to display the array when the page loads
    displayTargetUrls(currentUrlList, onRemove);

    updateInfoString();
    setInterval(updateInfoString, 60000)
})()

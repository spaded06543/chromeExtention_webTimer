import { timeSaver } from "./utility.js"

let currentUrlList = undefined;
async function displayTargetUrls(urlList) {
    var arrayContainer = document.getElementById("currentUrls");

    // Clear any existing content in the container
    arrayContainer.innerHTML = "";

    var ul = document.createElement("ul");
    
    urlList.forEach(
        function(item) 
        {
            var li = document.createElement("li");
            li.textContent = item;
            ul.appendChild(li);
        });

    // Append the unordered list to the container
    arrayContainer.appendChild(ul);
}

function updateUrls()
{
    var website = document.getElementById('webList').value;
    currentUrlList.push(website);
    displayTargetUrls(currentUrlList);
}

function updateAlarmPeriod()
{
    var website = document.getElementById('websiteInput').value;
    var timeThreshold = document.getElementById('timeThresholdInput').value;
    chrome.storage.sync.set({
        'website': website,
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
    displayTargetUrls(currentUrlList);

    updateInfoString();
    setInterval(updateInfoString, 60000)
})()

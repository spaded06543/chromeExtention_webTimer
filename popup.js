import { timeSaverInitializationPromise } from "./utility.js";

(async function()
{
    const timeSaver = await timeSaverInitializationPromise;
    const alarmData = timeSaver.dataHandler.alarmData;
    const alarmPeriod = timeSaver.dataHandler.alarmPeriod;
    const urlList = timeSaver.dataHandler.urlList;

    function renderUrlList(list)
    {
        var arrayContainer = document.getElementById("currentUrls");
            
        // Clear any existing content in the container
        arrayContainer.innerHTML = "";
    
        var ul = document.createElement("ul");
        
        list.forEach(
            (item) =>
            {
                var li = document.createElement("li");
                li.textContent = item + '\n';
                ul.appendChild(li);
                var removeButton = document.createElement("button");
                removeButton.innerText = "remove";
                removeButton.addEventListener('click', (ev) => removeUrl(item));
                li.appendChild(document.createElement("br"));
                li.appendChild(removeButton);
            });
    
        // Append the unordered list to the container
        arrayContainer.appendChild(ul);
    }
    let urlListCache = urlList.value;
    renderUrlList(urlListCache);
    
    urlList.addListener(
        (oldValue, newValue) => 
        {
            urlListCache = newValue;
            console.log(`on list changed :\n${JSON.stringify(urlListCache)}`);
            renderUrlList(urlListCache);
        });
    
    async function addUrl(addedUrl)
    {
        if(urlListCache.indexOf(addedUrl) != -1)
            return;
        urlListCache.push(addedUrl);
        urlList.setValue(urlListCache);
    };

    async function removeUrl(removedUrl)
    {
        var targetIndex = urlListCache.indexOf(removedUrl);
        if(targetIndex == -1)
            return;
        urlListCache.splice(targetIndex, 1);
        urlList.setValue(urlListCache);
    };
    
    document
        .getElementById("updateUrls")
        .addEventListener("click", (ev) =>
            {
                var inputUrl = document.getElementById('addUrl');
                addUrl(inputUrl.value);
                inputUrl.value = "";
            });
    
    document.getElementById('alarmPeriod').value = alarmPeriod.value.toString();
    alarmPeriod.addListener(
        (oldValue, newValue) =>
        {
            document.getElementById('alarmPeriod').value = newValue;
        });

    document
        .getElementById("updateAlarmPeriod")
        .addEventListener("click", (ev) =>
            {
                var timeThreshold = parseFloat(document.getElementById('timeThresholdInput').value);
                
                if(timeThreshold === NaN || timeThreshold <= 0)
                {
                    alert("Alarm Period is negative or unrecognizable");
                    return;
                }
                
                alarmPeriod.setValue(timeThreshold);
            });
    
    function updateInfoString()
    {
        document.getElementById('currentInformation').innerText = 
            timeSaver.dataToInfoString(alarmData.value, alarmPeriod.value);
    }

    updateInfoString();
    alarmData.addListener((oldValue, newValue) => updateInfoString());
    alarmPeriod.addListener((oldValue, newValue) => updateInfoString());
    
})()

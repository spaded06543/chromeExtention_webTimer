import { timeSaver } from "./utility.js"

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
    document
        .getElementById("updateUrls")
        .addEventListener("click", (ev) =>
            {
                var inputUrl = document.getElementById('addUrl');
                timeSaver.addUrl(inputUrl.value);
                inputUrl.value = "";
            });
    document
        .getElementById("updateAlarmPeriod")
        .addEventListener("click", (ev) =>
            {
                var input = document.getElementById('websiteInput').value;
                var timeThreshold = document.getElementById('timeThresholdInput').value;
            });
    
    timeSaver
        .onLocalStorageUrlListChange
        .addListener(urlList => 
            {
                console.log(`on list changed :\n${JSON.stringify(urlList)}`);
                var arrayContainer = document.getElementById("currentUrls");
            
                // Clear any existing content in the container
                arrayContainer.innerHTML = "";
            
                var ul = document.createElement("ul");
                
                urlList.forEach(
                    (item) =>
                    {
                        var li = document.createElement("li");
                        li.textContent = item + '\n';
                        ul.appendChild(li);
                        var removeButton = document.createElement("button");
                        removeButton.innerText = "remove";
                        removeButton.addEventListener('click', (ev) => timeSaver.removeUrl(item));
                        li.appendChild(document.createElement("br"));
                        li.appendChild(removeButton);
                    });
            
                // Append the unordered list to the container
                arrayContainer.appendChild(ul);
            });

    updateInfoString();
    setInterval(updateInfoString, 60000)
})()

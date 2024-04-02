import { timeSaver } from "./utility.js";

let targetUrls = [];

const isInTargetUrls = (url) => url && indexOfUrl(url ?? "") != -1;
const indexOfUrl = (url) => targetUrls.findIndex(v => url.startsWith(v));

let openUrlTime = -1;
let cacheData = undefined;
let previousUrl = undefined;

async function updateAlarm(url)
{
    if(isInTargetUrls(url))
        openUrlTime = Date.now();
    else
    {
        openUrlTime = -1;
    }
    previousUrl = url;
}

let executingTask = undefined;
async function runCritical(task)
{
    if(!(executingTask === undefined))
        await executingTask
    executingTask = task();
    await executingTask;
    executingTask = undefined;
}

runCritical(
    async () =>
    {
        console.log(`background initialization starting...`);

        timeSaver.onLocalStorageUrlListChange.addListener(
            newUrlList =>
            {
                targetUrls = newUrlList;
                updateAlarm(previousUrl);
            });
        
        cacheData = await timeSaver.getAlarmData();
        
        console.log(`initializing data`);
        let timeDiff = Date.now() - cacheData.updateTime;
        console.log(`check reset timer condition\npassing time from last update : ${(timeDiff / 60000).toFixed(0)} minutes`);
        
        if(cacheData.updateTime > 0 && timeDiff > 18000000)
        {
            console.log(`reset alarm time`);
            cacheData = timeSaver.createDefaultData();
        }

        console.log(`result : ${JSON.stringify(cacheData)}`);
        console.log(`background initialization finished`);
    });

chrome.alarms.onAlarm.addListener(
    (alarm) =>
    {
        runCritical(
            async () =>
            {
                if((!cacheData) || openUrlTime == -1 || currentActivateInfo == undefined)
                    return;
                
                cacheData.totalUsingTime += (Date.now() - openUrlTime) / 60000;

                if(cacheData.totalUsingTime >= cacheData.nextAlarmUsingTime)
                {
                    console.log(`on alarm : ${JSON.stringify(alarm)}`);
                
                    cacheData.nextAlarmUsingTime += 
                        timeSaver.alarmTimeInMinutes *
                        Math.ceil((cacheData.totalUsingTime - cacheData.nextAlarmUsingTime) / timeSaver.alarmTimeInMinutes);
                    
                    showAlarmData(cacheData);
                }

                await timeSaver.saveAlarmData(cacheData);
            })
    });

let currentActivateInfo = undefined;

chrome.tabs.onActivated.addListener(
    activateInfo =>
    {
        runCritical(
            async () =>
            {
                currentActivateInfo = activateInfo;
                console.log(`activateTab : ${JSON.stringify(currentActivateInfo)}`)
                let tabInfo = await chrome.tabs.get(activateInfo.tabId);
                
                await updateAlarm(tabInfo.url);
            });
    });

chrome.tabs.onUpdated.addListener(
    (tabId, changeInfo, tab) =>
    {
        runCritical(
            async () =>
            {
                if (changeInfo.status != "complete")
                    return;
                console.log(`update tag, tabId : ${tabId}\ntitle : ${tab.title}\nurl : ${tab.url}`)
                
                if(currentActivateInfo !== undefined && tabId == currentActivateInfo.tabId)
                    await updateAlarm(tab.url);
            });
    });

chrome.tabs.onRemoved.addListener(
    (tabId, removeInfo) =>
    {
        runCritical(
            async () =>
            {
                console.log(`closing tab : ${tabId}`);
        
                if(currentActivateInfo === undefined || currentActivateInfo.tabId != tabId)
                    return;

                updateAlarm(undefined);
            });
    });

function showAlarmData(data)
{
    createMyNotification(
        "Time Alarm",
        timeSaver.dataToInfoString(data),
        [{title : "Got it"}]);
}

function createMyNotification(title, message, buttons)
{
    console.log(`title : ${title}\nmessage : ${message}`);
    chrome.notifications.create(
        'mySnsAlarm',
        {
            type : "basic",
            iconUrl : 'images/timer_128.png',
            title : title,
            message : message,
            buttons : buttons,
            priority : 2,
        })
}
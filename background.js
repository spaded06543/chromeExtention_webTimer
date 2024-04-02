import { timeSaver } from "./utility.js";

let targetUrls = [];

const isInTargetUrls = (url) => url && indexOfUrl(url ?? "") != -1;
const indexOfUrl = (url) => targetUrls.findIndex(v => url.startsWith(v));

let openUrlTime = -1;
let cacheData = undefined;
let previousUrl = undefined;

function updateAlarm(url)
{
    if(isInTargetUrls(url))
        openUrlTime = Date.now();
    else
    {
        openUrlTime = -1;
    }
    previousUrl = url;
}


timeSaver.onLocalStorageUrlListChange.addListener(
    newUrlList =>
    {
        targetUrls = newUrlList;
        updateAlarm(previousUrl);
    });

const initialization = 
    (async () =>
    {
        console.debug(`begin data initialization`);
        
        cacheData = await timeSaver.getAlarmData();
        let timeDiff = Date.now() - cacheData.updateTime;
        
        console.debug(`check reset timer condition\npassing time from last update : ${(timeDiff / 60000).toFixed(0)} minutes`);
        
        if(cacheData.updateTime > 0 && timeDiff > 18000000)
        {
            console.debug(`reset alarm time`);
            cacheData = timeSaver.createDefaultData();
        }

        console.debug(`result : ${JSON.stringify(cacheData)}`);
        console.debug(`data initialization finished`);
    })();

chrome.alarms.onAlarm.addListener(
    async (alarm) =>
    {
        await initialization;
        
        if((!cacheData) || openUrlTime == -1 || currentActivateInfo == undefined)
            return;
                
        var currentTime = Date.now();
        cacheData.totalUsingTime += (currentTime - openUrlTime) / 60000;
        openUrlTime = currentTime;

        if(cacheData.totalUsingTime >= cacheData.nextAlarmUsingTime)
        {
            console.debug(`on alarm : ${JSON.stringify(alarm)}`);
        
            cacheData.nextAlarmUsingTime += 
                timeSaver.alarmTimeInMinutes *
                Math.ceil((cacheData.totalUsingTime - cacheData.nextAlarmUsingTime) / timeSaver.alarmTimeInMinutes);
            
            showAlarmData(cacheData);
        }

        await timeSaver.saveAlarmData(cacheData);
    });

let currentActivateInfo = undefined;

chrome.tabs.onActivated.addListener(
    activateInfo =>
    {
        runCritical(
            async () =>
            {
                currentActivateInfo = activateInfo;
                console.debug(`activateTab : ${JSON.stringify(currentActivateInfo)}`)
                let tabInfo = await chrome.tabs.get(activateInfo.tabId);
                
                await updateAlarm(tabInfo.url);
            });
    });

chrome.tabs.onUpdated.addListener(
    (tabId, changeInfo, tab) =>
    {
        if (changeInfo.status != "complete")
            return;
        console.debug(`update tag, tabId : ${tabId}\ntitle : ${tab.title}\nurl : ${tab.url}`)
        
        if(currentActivateInfo !== undefined && tabId == currentActivateInfo.tabId)
            updateAlarm(tab.url);
    });

chrome.tabs.onRemoved.addListener(
    (tabId, removeInfo) =>
    {
        console.debug(`closing tab : ${tabId}`);
        
        if(currentActivateInfo === undefined || currentActivateInfo.tabId != tabId)
            return;

        updateAlarm(undefined);
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
    console.debug(`title : ${title}\nmessage : ${message}`);
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
import { timeSaver } from "./utility.js";

let targetUrls = [];

const isInTargetUrls = (url) => url && indexOfUrl(url ?? "") != -1;
const indexOfUrl = (url) => targetUrls.findIndex(v => url.startsWith(v));

let prevOpenTime = -1;
let cacheData = undefined;
let tabUrlMap = {};
let currentTabId = undefined;

const currentTabIdInit = 
    (async () =>
    {
        let currentTab = await chrome.tabs.query({'active': true, 'lastFocusedWindow': true, 'currentWindow': true});
        if(currentTab !== undefined && currentTab.length != 0)
            currentTabId = currentTab[0].id;
    })();

const tabUrlMapInit = 
    chrome.tabs.query({}, tabs => tabUrlMap = Object.fromEntries(tabs.map(t => [t.id, t.url])));

const dataInit = 
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

let init = Promise.all([currentTabIdInit, dataInit, tabUrlMapInit]);

timeSaver.onLocalStorageUrlListChange.addListener(
    newUrlList =>
    {
        targetUrls = newUrlList;
        console.info(`new list :\n${JSON.stringify(newUrlList)}`);
        updateData();
    });

async function updateData()
{
    await init;

    console.debug(`current tab ${currentTabId}, url : ${tabUrlMap[currentTabId]}`);

    if(!isInTargetUrls(tabUrlMap[currentTabId]))
    {
        prevOpenTime = -1;
        return;
    }
    
    if(prevOpenTime == -1)
    {
        prevOpenTime = Date.now();
        return;
    }

    var currentTime = Date.now();
    cacheData.totalUsingTime += (currentTime - prevOpenTime) / 60000;
    prevOpenTime = currentTime;

    if(cacheData.totalUsingTime >= cacheData.nextAlarmUsingTime)
    {
        console.debug(`on alarm : ${JSON.stringify(alarm)}`);
    
        cacheData.nextAlarmUsingTime += 
            timeSaver.alarmTimeInMinutes *
            Math.ceil((cacheData.totalUsingTime - cacheData.nextAlarmUsingTime) / timeSaver.alarmTimeInMinutes);
        
        showAlarmData(cacheData);
    }

    await timeSaver.saveAlarmData(cacheData);
}

chrome.alarms.onAlarm.addListener((alarm) => updateData());

chrome.tabs.onActivated.addListener(
    async activateInfo =>
    {
        currentTabId = activateInfo.tabId;
        console.debug(`activateTabId : ${currentTabId}`);
        updateData();
    });

chrome.tabs.onUpdated.addListener(
    (tabId, changeInfo, tab) =>
    {
        if (changeInfo.status != "complete")
            return;
        console.debug(`update tag, tabId : ${tabId}\nurl : ${tab.url}`)
        tabUrlMap[tabId] = tab.url;
        updateData();
    });

chrome.tabs.onRemoved.addListener(
    (tabId, removeInfo) =>
    {
        console.debug(`closing tab : ${tabId}`);
        
        if(tabUrlMap[tabId] !== undefined)
            delete tabUrlMap[tabId];
        updateData();
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
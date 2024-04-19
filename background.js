import { AlarmData, timeSaverInitializationPromise } from "./utility.js";

chrome.alarms.getAll().then(
    alarms =>
    {
        if(alarms.length == 0)
        {
            chrome.alarms.create(
                timeSaver.alarmName,
                {
                    periodInMinutes : 0.1,
                });
        }
    });

let updateData = () => {};

chrome.alarms.onAlarm.addListener((alarm) => updateData());


let tabUrlMap = {};
let currentTabId = undefined;

chrome.tabs.onActivated.addListener(
    async function(activateInfo)
    {
        currentTabId = activateInfo.tabId;
        console.debug(`activateTabId : ${currentTabId}`);
        updateData();
    });

chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo, tab)
    {
        if (changeInfo.status != "complete")
            return;
        console.debug(`update tag, tabId : ${tabId}\nurl : ${tab.url}`)
        tabUrlMap[tabId] = tab.url;
        updateData();
    });

chrome.tabs.onRemoved.addListener(
    function(tabId, removeInfo)
    {
        console.debug(`closing tab : ${tabId}`);
        
        if(tabUrlMap[tabId] !== undefined)
            delete tabUrlMap[tabId];
        updateData();
    });

const currentTabIdInit = 
    (async () =>
    {
        let currentTab = await chrome.tabs.query({'active': true, 'lastFocusedWindow': true, 'currentWindow': true});
        if(currentTab !== undefined && currentTab.length != 0)
            currentTabId = currentTab[0].id;
    })();

const tabUrlMapInit = 
    chrome.tabs.query({}, tabs => tabUrlMap = Object.fromEntries(tabs.map(t => [t.id, t.url])));


(async function()
{
    console.debug(`Worker initialization`);

    await Promise.all([currentTabIdInit, tabUrlMapInit]);
    const timeSaver = await timeSaverInitializationPromise;
    const alarmDataHandler = timeSaver.dataHandler.alarmData;
    const urlListHandler = timeSaver.dataHandler.urlList;
    const alarmPeriodHandler = timeSaver.dataHandler.alarmPeriod;
    
    let alarmDataCache = alarmDataHandler.value;
    const timeDiff = Date.now() - alarmDataCache.updateTime;
    console.debug(`check reset timer condition\npassing time from last update : ${(timeDiff / 60000).toFixed(0)} minutes`);
    
    if(alarmDataCache.updateTime > 0 && timeDiff > 18000000)
    {
        console.debug(`reset alarm time`);
        alarmDataCache = new AlarmData();
        alarmDataHandler.saveValue(alarmDataCache);
    }
    
    console.debug(`result : ${JSON.stringify(alarmDataCache)}`);

    alarmPeriodHandler.addListener((oldPeriod, newPeriod) => updateData());
    
    let targetUrls = urlListHandler.value;
    urlListHandler.addListener(
        (oldValue, newValue) =>
        {
            targetUrls = newValue;
            console.debug(`new list :\n${JSON.stringify(newValue)}`);
            updateData();
        });
    
    let prevOpenTime = -1;

    const isInTargetUrls = (url) => url && indexOfUrl(url ?? "") != -1;
    const indexOfUrl = (url) => targetUrls.findIndex(v => url.startsWith(v));
    const getNextStatus = function(inUrlList)
        {
            if(inUrlList)
                return statusOn.CreateNext();
            return statusOff.CreateNext();
        };

    const statusOff = 
        {
            Process : () => {},
            CreateNext : () => statusOff,
        };

    const statusOn = 
        {
            prevTime: -1,
            Process :
                () => 
                {
                    var currentTime = Date.now();
                    
                    alarmDataCache.updateTime = currentTime;
                    alarmDataCache.totalUsingTime += (currentTime - statusOn.prevTime) / 60000;
            
                    if(alarmDataCache.totalUsingTime >= alarmDataCache.lastAlarmTime + alarmPeriodHandler.value)
                    {
                        console.debug(`on alarm : ${JSON.stringify(alarmDataCache)}`);
                    
                        alarmDataCache.lastAlarmTime = alarmDataCache.totalUsingTime;
                        createMyNotification(
                            "Time Alarm",
                            timeSaver.dataToInfoString(alarmDataCache, alarmPeriodHandler.value),
                            [{title : "Got it"}])
                    }
                },
            CreateNext : () => 
                {
                    statusOn.prevTime = Date.now();
                    return statusOn;
                },
        };

    var status = statusOff;

    updateData = async () =>
        {
            console.debug(`current tab ${currentTabId}, url : ${tabUrlMap[currentTabId]}`);
            status.Process();
            status = getNextStatus(isInTargetUrls(tabUrlMap[currentTabId]));
            alarmDataHandler.saveValue(alarmDataCache);
        }

    console.debug(`Worker initialization finished`);
})();

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
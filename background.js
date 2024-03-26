const targetSnsSets =
    [
        'https://www.facebook.com/', 
        'https://www.plurk.com/', 
        'https://twitter.com/', 
        'https://discord.com/', 
        'https://www.youtube.com/watch?v=',
        'https://www.youtube.com/shorts', 
        'https://www.gamer.com.tw/',
        'https://www.ptt.cc/bbs/'
    ];
const myAlarmName = "mySnsAlarm";
const alarmTimeInMilliSeconds = 600000;
const snsAlarmDataKey = "snsAlarmData";

function clearAlarm()
{
    // console.log(`Clear alarm`);
    chrome.alarms.clear(myAlarmName);
}

async function getAlarmData()
{
    let result = await chrome.storage.local.get(snsAlarmDataKey);
    if(result === undefined)
    {
        console.log(`alarm data doesn't exist`);
        return undefined;
    }
    console.log(`get data : ${JSON.stringify(result[snsAlarmDataKey])}`);
    return result[snsAlarmDataKey];
}

function setAlarmData(data)
{
    console.log(`save data : ${JSON.stringify(data)}`);
    let wrapper = {};
    data.updateTime = Date.now();
    wrapper[snsAlarmDataKey] = data;
    return chrome.storage.local.set(wrapper);
}

function isStartSns(url)
{
    url = url ?? "";
    let targetSNS = targetSnsSets.find((v, _, __) => url.startsWith(v));
    // console.log(`check url: ${url}, result : ${targetSNS}`);
    return !(targetSNS === undefined);
}

async function setAlarm()
{
    let restAlarmTimeInMinutes = await getRestAlarmTime() / 60000;
    console.log(`Set alarm time : ${restAlarmTimeInMinutes} minutes (${restAlarmTimeInMinutes * 60} seconds)`);
    chrome.alarms.create(
        myAlarmName,
        {
            delayInMinutes : Math.max(0.5, restAlarmTimeInMinutes),
        });
}

async function updateAlarmData()
{
    let snsAlarmData = await getAlarmData();
    
    if(snsAlarmData.lastStartSnsTime > 0)
    {
        let now = Date.now();
        let usingTime = now - snsAlarmData.lastStartSnsTime;
        snsAlarmData.totalUsingTime += usingTime;
        snsAlarmData.lastStartSnsTime = now;
        
        if(snsAlarmData.totalUsingTime >= snsAlarmData.nextAlarmUsingTime)
        {
            snsAlarmData.nextAlarmUsingTime += 
                alarmTimeInMilliSeconds * 
                Math.ceil((snsAlarmData.totalUsingTime - snsAlarmData.nextAlarmUsingTime) / alarmTimeInMilliSeconds)
        }
        
        await setAlarmData(snsAlarmData);
    }

    return snsAlarmData;
}

async function resetNextAlarmTime()
{
    let snsAlarmData = await getAlarmData();
    snsAlarmData.nextAlarmUsingTime = alarmTimeInMilliSeconds;
    snsAlarmData.totalUsingTime = 0;
    await setAlarmData(snsAlarmData);
}

async function getRestAlarmTime()
{
    let snsAlarmData = await getAlarmData();
    let restAlarmTime = alarmTimeInMilliSeconds;
    if(snsAlarmData.nextAlarmUsingTime !== undefined && snsAlarmData.nextAlarmUsingTime > snsAlarmData.totalUsingTime)
    {
        restAlarmTime = snsAlarmData.nextAlarmUsingTime - snsAlarmData.totalUsingTime;
        if(snsAlarmData.lastStartSnsTime > 0)
        {
            restAlarmTime -= (snsAlarmData.lastStartSnsTime - Date.now());
        }
        else
        {
            console.log(`exclude lastStartSnsTime`);
        }
    }
    else
    {
        console.log(`Unable to get rest alarm time from data: ${JSON.stringify(snsAlarmData)}`);
    }

    return restAlarmTime;
}

async function setRestAlarmTime(alarmTime)
{
    let snsAlarmData = await getAlarmData();
    snsAlarmData.nextAlarmUsingTime = alarmTime;
    await setAlarmData(snsAlarmData);
}

async function setLastSNSTime(lastStartSnsTime)
{
    let snsAlarmData = await getAlarmData();
    snsAlarmData.lastStartSnsTime = lastStartSnsTime;
    await setAlarmData(snsAlarmData);
}

let previousState = false;

async function updateAlarm(url)
{
    
    let startSns = isStartSns(url);
    
    if(previousState == startSns)
        return;
    previousState = startSns
    
    await updateAlarmData();

    if(startSns)
    {
        console.log(`Alarm On`);
        await setLastSNSTime(Date.now());
        await setAlarm();
    }
    else
    {
        console.log(`Alarm Off`);
        await setLastSNSTime(-1);
        clearAlarm();
    }
}

let previous = undefined;
async function runCritical(code)
{
    if(!(previous === undefined))
        await previous
    previous = code();
    await previous;
    previous = undefined;
}

runCritical(
    async () =>
    {
        console.log(`background initialization starting...`);
        
        let cleanResult = await chrome.alarms.clearAll();
        let alarms = await chrome.alarms.getAll();
        console.log(`alarm clean result : ${cleanResult}, number after clear all : ${alarms.length}`);
        let alarmData = await getAlarmData();
        
        if(alarmData === undefined)
        {
            console.log(`initializing data`);
            await setAlarmData(
                {
                    totalUsingTime : 0,
                    lastStartSnsTime : -1,
                    nextAlarmUsingTime : alarmTimeInMilliSeconds
                });
        }
        else
        {
            let timeDiff = Date.now() - alarmData.updateTime;
            console.log(`check reset timer condition\npassing time from last update : ${(timeDiff / 60000).toFixed(0)} minutes`);
            if(alarmData.updateTime === undefined || timeDiff > 18000000)
            {
                console.log(`reset alarm time`);
                await resetNextAlarmTime();
            }
        }
        console.log(`result : ${JSON.stringify(await getAlarmData())}`);
        console.log(`background initialization finished`);
    });

chrome.alarms.onAlarm.addListener(
    (alarm) =>
    {
        runCritical(
            async () =>
            {
                if(alarm.name !== myAlarmName || currentActivateInfo == undefined)
                    return;
        
                let snsData = await updateAlarmData();

                if(!(snsData.lastStartSnsTime > 0))
                    return;

                console.log(`on alarm : ${JSON.stringify(alarm)}`);
                
                createMyNotification(
                    "SNS Alarm",
                    `It has been ${(snsData.totalUsingTime / 60000).toFixed(0)} minutes on SNS.`,
                    [{title : "Got it"}]);

                await setAlarm();
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

async function saveDataAndcleanUp()
{
    console.log(`start saving and cleaning up`);
    await updateAlarmData();
    await setLastSNSTime(-1);
    await chrome.alarms.clearAll();
    console.log(`finish saving and cleaning up`);
}

chrome.tabs.onRemoved.addListener(
    (tabId, removeInfo) =>
    {
        runCritical(
            async () =>
            {
                console.log(`closing tab : ${tabId}`);
        
                if(currentActivateInfo === undefined || currentActivateInfo.tabId != tabId)
                    return;

                await saveDataAndcleanUp();
            });
    });

chrome.windows.onRemoved.addListener(
    (windowId) =>
    {
        runCritical(
            async () =>
            {
                let windows = await chrome.windows.getAll({windowTypes : ["normal"]});
                if(windows.length == 0)
                {
                    console.log(`All windows is closed`);
                    await saveDataAndcleanUp();
                }
            });
    },
    );

chrome.action.onClicked.addListener(
    (tab) =>
    {
        runCritical(
            async () =>
            {
                let snsData = await getAlarmData();
                let nextAlarmTimeText = `--`;
                let restAlarmTimeText = `--`;
                let totalUsingTime = snsData.totalUsingTime;
                let totalUsingTimeText = `${((totalUsingTime) / 60000).toFixed(0)} minutes`;
                if(snsData.lastStartSnsTime > 0)
                {
                    totalUsingTime += Date.now() - snsData.lastStartSnsTime;
                    let restAlarmTime = await getRestAlarmTime();
                    let nextAlarmTime = Date.now() + restAlarmTime;
                    let nextAlarmFormatTime = new Date(0);
                    nextAlarmFormatTime.setMilliseconds(nextAlarmTime);
                    nextAlarmTimeText = `${nextAlarmFormatTime.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit',})}`;
                    restAlarmTimeText = `${(restAlarmTime / 60000).toFixed(0)} minutes`;
                }
                
                createMyNotification(
                    "Status",
                    `[ SNSData ]\nToday Total SNS Time : ${totalUsingTimeText}\nNext Alarm Time : ${nextAlarmTimeText}\nRest Alarm Time : ${restAlarmTimeText}`,
                    [{title : "Got it"}]);
            });
    });

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

chrome.runtime.onSuspend.addListener(
    () =>
    {
        runCritical(
            async () =>
            {
                console.log(`on suspending`);
                await saveDataAndcleanUp();
            }
        )
    });
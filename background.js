const targetUrls =
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
const alarmTimeInMinutes = 10;
const snsAlarmDataKey = "snsAlarmData";
const ticPeriodInMinutes = 0.1;

function getDefaultData()
{
    let ret = 
        {
            totalUsingTime : 0,
            nextAlarmUsingTime : alarmTimeInMinutes,
            updateTime : -1
        };
    return ret;
}

async function getAlarmData()
{
    let result = await chrome.storage.local.get();
    
    if(result === undefined)
        return getDefaultData();

    console.log(`get data : ${JSON.stringify(result)}`);
    
    return result[snsAlarmDataKey];
}

async function saveAlarmData(data)
{
    data.updateTime = Date.now();
    let wrapper = {};
    wrapper[snsAlarmDataKey] = data;

    console.log(`set data : ${JSON.stringify(wrapper)}`);
    

    await chrome.storage.local.set(wrapper);
}

function isTargetUrl(url)
{
    url = url ?? "";
    let targetSNS = targetUrls.find((v, _, __) => url.startsWith(v));
    return !(targetSNS === undefined);
}

let previousResult = false;

async function updateAlarm(url)
{
    let result = isTargetUrl(url);
    
    if(previousResult == result)
        return;
    
    previousResult = result
    
    if(result)
    {
        if((await chrome.alarms.getAll()).length > 0)
            return;
        
        console.log(`Alarm On`);
        chrome.alarms.create(
            myAlarmName,
            {
                periodInMinutes : ticPeriodInMinutes,
            });
    }
    else
    {
        console.log(`Alarm Off`);
        await chrome.alarms.clear(myAlarmName);
    }
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

        let cleanResult = await chrome.alarms.clearAll();
        console.log(`alarm clean result : ${cleanResult}, number after clear all : ${(await chrome.alarms.getAll()).length}`);
        
        let alarmData = await getAlarmData();
        
        console.log(`initializing data`);
        let timeDiff = Date.now() - alarmData.updateTime;
        console.log(`check reset timer condition\npassing time from last update : ${(timeDiff / 60000).toFixed(0)} minutes`);
        
        if(alarmData.updateTime > 0 && timeDiff > 18000000)
        {
            console.log(`reset alarm time`);
            await saveAlarmData(getDefaultData());
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
                let alarmDelayInMinutes = (Date.now() - alarm.scheduledTime) / 60000;
                
                //set a threshold to skip unexpected alarm from previous start up.
                console.log(`alarm delay: ${alarmDelayInMinutes}`);
                if(alarmDelayInMinutes >= 0.2)
                    return;

                if(alarm.name !== myAlarmName || currentActivateInfo == undefined)
                    return;
                
                let data = await getAlarmData();
    
                data.totalUsingTime += ticPeriodInMinutes;

                if( alarmDelayInMinutes > 0)
                    data.totalUsingTime += alarmDelayInMinutes ;

                if(data.totalUsingTime >= data.nextAlarmUsingTime)
                {
                    console.log(`on alarm : ${JSON.stringify(alarm)}`);
                
                    data.nextAlarmUsingTime += 
                        alarmTimeInMinutes *
                        Math.ceil((data.totalUsingTime - data.nextAlarmUsingTime) / alarmTimeInMinutes);
                    
                    showAlarmData(data);
                }

                await saveAlarmData(data);
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

                updateAlarm("");
            });
    });

chrome.action.onClicked.addListener(
    tab => runCritical(async () => showAlarmData(await getAlarmData())));

function showAlarmData(data)
{
    createMyNotification(
        "Time Alarm",
        `Total spending time : ${data.totalUsingTime.toFixed(0)} minutes.\nNext alarm time : ${data.nextAlarmUsingTime} minutes`,
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
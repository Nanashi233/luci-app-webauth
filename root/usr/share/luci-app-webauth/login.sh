#!/bin/sh
id=$(uci get webauth.settings.account)
password=$(uci get webauth.settings.password)
service=$(uci get webauth.settings.service)
queryString=$(uci get webauth.settings.queryString)
interface=$(uci get webauth.settings.interface)
captiveReturnCode=`curl -s -I -m 10 -o /dev/null -s -w %{http_code} http://www.google.cn/generate_204`

if [ "${captiveReturnCode}" = "204" ]; then
    echo -n "You have successfully certified!"
else
    loginPageURL=$(curl -s "http://www.google.cn/generate_204" | awk -F \' '{print $2}')
    loginURL=$(echo ${loginPageURL} | awk -F \? '{print $1}')
    loginURL="${loginURL/index.jsp/InterFace.do?method=login}"
    queryString="${queryString//&/%2526}"
    queryString="${queryString//=/%253D}"
    if [ -n "${loginURL}" ]; then
        authResult=$(curl -s --interface ${interface} -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36" -e "${loginPageURL}" -b "EPORTAL_COOKIE_USERNAME=; EPORTAL_COOKIE_PASSWORD=; EPORTAL_COOKIE_SERVER=; EPORTAL_COOKIE_SERVER_NAME=; EPORTAL_AUTO_LAND=; EPORTAL_USER_GROUP=; EPORTAL_COOKIE_OPERATORPWD=;" -d "userId=${id}&password=${password}&service=${service}&queryString=${queryString}&operatorPwd=&operatorUserId=&validcode=&passwordEncrypt=false" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8" -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" "${loginURL}")
        echo -n $authResult
    fi
fi
echo " @ `date +"%Y-%m-%d %H:%M:%S"`"
exit 0

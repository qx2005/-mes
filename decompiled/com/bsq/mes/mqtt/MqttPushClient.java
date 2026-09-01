/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.bsq.common.core.domain.AjaxResult
 *  com.bsq.mes.mqtt.PushCallback
 *  org.eclipse.paho.client.mqttv3.MqttCallback
 *  org.eclipse.paho.client.mqttv3.MqttClient
 *  org.eclipse.paho.client.mqttv3.MqttClientPersistence
 *  org.eclipse.paho.client.mqttv3.MqttConnectOptions
 *  org.eclipse.paho.client.mqttv3.MqttDeliveryToken
 *  org.eclipse.paho.client.mqttv3.MqttException
 *  org.eclipse.paho.client.mqttv3.MqttMessage
 *  org.eclipse.paho.client.mqttv3.MqttPersistenceException
 *  org.eclipse.paho.client.mqttv3.MqttTopic
 *  org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.bsq.mes.mqtt;

import com.bsq.common.core.domain.AjaxResult;
import com.bsq.mes.mqtt.PushCallback;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttClientPersistence;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.MqttPersistenceException;
import org.eclipse.paho.client.mqttv3.MqttTopic;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class MqttPushClient {
    private static final Logger logger = LoggerFactory.getLogger(MqttPushClient.class);
    @Autowired
    private PushCallback pushCallback;
    private static MqttClient client;

    private static MqttClient getClient() {
        return client;
    }

    private static void setClient(MqttClient client) {
        MqttPushClient.client = client;
    }

    public void connect(String host, String clientID, String username, String password, int timeout, int keepalive) {
        try {
            client = new MqttClient(host, clientID, (MqttClientPersistence)new MemoryPersistence());
            MqttConnectOptions options = new MqttConnectOptions();
            options.setCleanSession(true);
            options.setUserName(username);
            options.setPassword(password.toCharArray());
            options.setConnectionTimeout(timeout);
            options.setKeepAliveInterval(keepalive);
            MqttPushClient.setClient(client);
            try {
                client.setCallback((MqttCallback)this.pushCallback);
                client.connect(options);
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    public AjaxResult publish(int qos, boolean retained, String topic, String pushMessage) {
        MqttMessage message = new MqttMessage();
        message.setQos(qos);
        message.setRetained(retained);
        message.setPayload(pushMessage.getBytes());
        MqttTopic mTopic = MqttPushClient.getClient().getTopic(topic);
        if (null == mTopic) {
            logger.error("topic not exist");
        }
        try {
            MqttDeliveryToken token = mTopic.publish(message);
            token.waitForCompletion();
            return AjaxResult.success();
        }
        catch (MqttPersistenceException e) {
            e.printStackTrace();
            return AjaxResult.error();
        }
        catch (MqttException e) {
            e.printStackTrace();
            return AjaxResult.error();
        }
    }

    public void subscribe(String topic, int qos) {
        logger.info("\u5f00\u59cb\u8ba2\u9605\u4e3b\u9898\uff1a" + topic);
        try {
            MqttPushClient.getClient().subscribe(topic, qos);
        }
        catch (MqttException e) {
            e.printStackTrace();
        }
    }
}

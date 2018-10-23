"use strict";

var AFG = {};

(function() {
    var google;

    var EVENTS = AFG.EVENTS = {
        LOADED: "loaded",
        LOAD_ERROR: "load_error",
        AD_START: "ad_start",
        AD_SKIPPED: "ad_skipped",
        AD_END: "ad_end",
        AD_CLICKED: "ad_clicked",
    };

    var AdSenseManager = AFG.AdSenseManager = function() {
        // do nothing
    };

    var proto = {
        _adIndex: null,
        _adsLoader: null,
        _adCache: null,
        _containerElement: null,

        disabled: false,

        // adsRequest: null,
        init: function(options, callback) {
            if (this.disabled) {
                return false;
            }

            var Me = this;
            var jsSrc = "//imasdk.googleapis.com/js/sdkloader/ima3.js";
            this._includeJS(jsSrc, function() {
                google = window.google;
                Me._initAdLoader(options);
                callback && callback();
            });

            window.adsbygoogle = window.adsbygoogle || [];
            this._adCache = {};
            this._adIndex = 0;
        },
        _initAdLoader: function(options) {
            var adDisplayContainer = this._createAdDisplayContainer(options.containerElement);
            var adsLoader = this._adsLoader = new google.ima.AdsLoader(adDisplayContainer);
            adsLoader.addEventListener(
                google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                this._onAdsManagerLoaded.bind(this),
                false);

            adsLoader.addEventListener(
                google.ima.AdErrorEvent.Type.AD_ERROR,
                this._onAdsManagerLoadError.bind(this),
                false);
        },
        _createAdDisplayContainer: function(containerElement) {
            if (!containerElement) {
                containerElement = this._createContainerElement();
            }
            this._containerElement = containerElement;
            this._showContainerElement(false);
            var adDisplayContainer = new google.ima.AdDisplayContainer(containerElement);
            adDisplayContainer.initialize();
            return adDisplayContainer;
        },
        createAd: function(options) {
            if (!google) {
                return false;
            }

            var name = this._generateName();
            var src = "https://googleads.g.doubleclick.net/pagead/ads";
            var pageUrl = options.descriptionPage || window.location.href;

            var params = {
                "ad_type": options.adType,
                "client": options.id || this.id,
                "description_url": pageUrl,
                "videoad_start_delay": options.delay || 0,
                "max_ad_duration": options.adDuration || (15 * 1000),
                "sdmax": options.skippableAdDuration || (30 * 1000),
                "hl": options.language || "en",
            };

            if (options.channel) {
                params["channel"] = options.channel;
            }

            var query = [];
            for (var p in params) {
                query.push(p + "=" + encodeURIComponent(params[p]));
            }
            var adTagUrl = src + "?" + query.join("&");

            var width = options.width || this.screenWidth || window.innerWidth;
            var height = options.height || this.screenHeight || window.innerHeight;
            options.width = width;
            options.height = height;
            // console.log(adTagUrl, width, height);

            var adsRequest = new google.ima.AdsRequest();
            adsRequest["adTagUrl"] = adTagUrl;
            adsRequest["forceNonLinearFullSlot"] = true;
            adsRequest["linearAdSlotWidth"] = width;
            adsRequest["linearAdSlotHeight"] = height;
            adsRequest["nonLinearAdSlotWidth"] = width;
            adsRequest["nonLinearAdSlotHeight"] = height;
            // adsRequest.vastLoadTimeout = options.vastLoadTimeout || 5000;

            var adsRenderingSettings = new google.ima.AdsRenderingSettings();
            adsRenderingSettings["restoreCustomPlaybackStateOnAdBreakComplete"] = true;
            adsRenderingSettings["useStyledNonLinearAds"] = false;
            adsRenderingSettings["useStyledLinearAds"] = false;

            this._adsLoader.requestAds(adsRequest, {
                name: name,
            });

            var ad = new AdSense();
            ad._init({
                manager: this,
                name: name,
                adOptions: options,
                adsRenderingSettings: adsRenderingSettings,
            });
            this._adCache[name] = ad;
            return ad;
        },
        _generateName: function() {
            return "googleAdForGame_" + (++this._adIndex);
        },
        _onAdsManagerLoaded: function(adsManagerLoadedEvent) {
            var requestContentObject = adsManagerLoadedEvent.getUserRequestContext();
            var name = requestContentObject.name;
            var ad = this._adCache[name];
            var adsManager = adsManagerLoadedEvent.getAdsManager({
                currentTime: 0,
                duration: 1,
            }, ad.adsRenderingSettings);

            var Me = this;
            adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE, function(addEvent) {
                // console.log("USER_CLOSE");
                Me._onAdClosed(name);
            });

            ad._onAdsManagerLoaded(adsManager);
        },
        _onAdsManagerLoadError: function(adErrorEvent) {
            var requestContentObject = adErrorEvent.getUserRequestContext();
            var name = requestContentObject.name;
            var ad = this._adCache[name];
            var error = adErrorEvent.getError();
            ad._onAdsManagerLoadError(error);
        },
        // onAdEvent: function(name, adEvent) {
        //     var ad = this._adCache[name];
        //     if (!ad) return;

        //     var type = adEvent.type;
        //     var AdEventType = google.ima.AdEvent.Type;
        // },
        _onAdClosed: function(name) {
            // console.log("on ad closed: ", name);
            // this._containerElement.hidden = true;
            // this._containerElement.style.display = "none";
            this._showContainerElement(false);
        },
        _showAd: function(ad) {
            // this._containerElement.hidden = false;
            this._showContainerElement(true);
        },
        _destroyAd: function(ad) {
            delete this._adCache[ad.name];
        },
        _createContainerElement: function() {
            var containerElement = document.createElement("div");
            var width = window.innerWidth;
            var height = window.innerHeight;
            var bgColor = "black";
            // containerElement.style.cssText = "position: absolute;top: 0px;left: 0px;";
            containerElement.style.cssText = "position: absolute;top: 0px;left: 0px;width: " + width + "px;height: " + height + "px;" + "background:" + bgColor + ";";
            // containerElement.hidden = true;
            document.body.appendChild(containerElement);
            return containerElement;
        },
        _showContainerElement: function(isShow) {
            this._containerElement.style.display = isShow ? "block" : "none";
        },
        _includeJS: function(src, onload, onerror) {
            var script = document.createElement("script");
            script.async = true;

            var done = false;
            script.onload = function(event) {
                if (done) {
                    return;
                }
                done = true;
                if (onload) {
                    onload(event);
                }
            };
            script.onerror = function(event) {
                if (onerror) {
                    onerror(event);
                }
            };

            var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
            head.insertBefore(script, head.firstChild);

            script.src = src;

            return script;
        },
    };

    for (var p in proto) {
        AdSenseManager.prototype[p] = proto[p];
    }

    var AdSense = AFG.AdSense = function() {
        EventEmitter3.call(this);
    }

    var AdSenseProto = {
        name: null,
        _manager: null,
        _adsManager: null,
        _adOptions: null,
        _adsRenderingSettings: null,
        destroyed: null,
        _init: function(options) {
            this.destroyed = false;
            this.loaded = false;
            this._adsManager = null;
            this._manager = options.manager;
            this.name = options.name;
            this._adsRenderingSettings = options.adsRenderingSettings;
            this._adOptions = options.adOptions;
        },
        show: function() {
            if (this.destroyed) return false;

            var adsManager = this._adsManager;
            if (!adsManager) return false;

            this._manager._showAd(this);

            var options = this._adOptions;
            adsManager.init(options.width, options.height, google.ima.ViewMode.NORMAL);
            adsManager.start();
            return true;
        },
        isLoaded: function() {
            return !!this._adsManager;
        },
        _onAdsManagerLoaded: function(adsManager) {
            this._adsManager = adsManager;

            var Me = this;
            var AdEventType = google.ima.AdEvent.Type;
            adsManager.addEventListener(AdEventType.STARTED, function() {
                Me.emit(EVENTS.AD_START);
            });

            adsManager.addEventListener(AdEventType.SKIPPED, function() {
                Me.emit(EVENTS.AD_SKIPPED);
            });

            adsManager.addEventListener(AdEventType.USER_CLOSE, function() {
                Me.emit(EVENTS.AD_END);
            });

            adsManager.addEventListener(AdEventType.CLICK, function() {
                Me.emit(EVENTS.AD_CLICKED);
            });

            this.emit(EVENTS.LOADED);
        },
        _onAdsManagerLoadError: function(error) {
            this.emit(EVENTS.LOAD_ERROR, error);
            this.destroy();
        },
        destroy: function() {
            this._manager._destroyAd(this);
            this._manager = null;

            this.destroyed = true;

            this._adsManager && this._adsManager.destroy();
            this._adsManager = null;

            this._adOptions = null;
            this._adsRenderingSettings = null;
            this.name = null;

            this.removeAllListeners();
        }
    }
    for (var p in EventEmitter3.prototype) {
        AdSense.prototype[p] = EventEmitter3.prototype[p];
    }
    for (var p in AdSenseProto) {
        AdSense.prototype[p] = AdSenseProto[p];
    }


    // don't obscure google's 'properties' .
    AdSenseManager._reserved = [
        "google", "ima", "adsbygoogle",
        "AdsLoader", "AdDisplayContainer", "AdsRenderingSettings", "AdsRequest",

        "initialize",
        "requestAds",
        "getUserRequestContext",
        "getAdsManager",
        "getError",
        "EventEmitter3",
        "addEventListener",
        "on",
        "name",
        "bind",
        "emit",
        "destroy",

        "ViewMode",
        "AdErrorEvent",
        "AdEvent", "AdEventType",
        "AdsManagerLoadedEvent",
        "Type",

        "AD_ERROR",
        "USER_CLOSE",
        "CLICK",
        "SKIPPED",
        "STARTED",
        "USER_CLOSE",
        "ADS_MANAGER_LOADED",
        "NORMAL",
    ];
}());

package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type aliyunCaptchaResponse struct {
	Code    string `json:"Code"`
	Message string `json:"Message"`
	Result  struct {
		VerifyResult bool   `json:"VerifyResult"`
		VerifyCode   string `json:"VerifyCode"`
	} `json:"Result"`
	Success bool `json:"Success"`
}

func percentEncode(s string) string {
	res := url.QueryEscape(s)
	res = strings.ReplaceAll(res, "+", "%20")
	res = strings.ReplaceAll(res, "*", "%2A")
	res = strings.ReplaceAll(res, "%7E", "~")
	return res
}

func verifyAliyunCaptcha(captchaVerifyParam, sceneId, ak, sk, region string) (bool, error) {
	endpoint := "https://captcha.cn-shanghai.aliyuncs.com/"
	if strings.ToLower(region) == "sgp" || strings.ToLower(region) == "ap-southeast-1" {
		endpoint = "https://captcha.ap-southeast-1.aliyuncs.com/"
	}

	params := map[string]string{
		"Action":             "VerifyIntelligentCaptcha",
		"Version":            "2023-03-05",
		"Format":             "JSON",
		"AccessKeyId":        ak,
		"SignatureMethod":    "HMAC-SHA1",
		"SignatureVersion":   "1.0",
		"SignatureNonce":     uuid.New().String(),
		"Timestamp":          time.Now().UTC().Format("2006-01-02T15:04:05Z"),
		"SceneId":            sceneId,
		"CaptchaVerifyParam": captchaVerifyParam,
	}

	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var canonicalizedParts []string
	for _, k := range keys {
		canonicalizedParts = append(canonicalizedParts, fmt.Sprintf("%s=%s", percentEncode(k), percentEncode(params[k])))
	}
	canonicalizedQueryString := strings.Join(canonicalizedParts, "&")

	stringToSign := fmt.Sprintf("POST&%s&%s", percentEncode("/"), percentEncode(canonicalizedQueryString))

	mac := hmac.New(sha1.New, []byte(sk+"&"))
	mac.Write([]byte(stringToSign))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	params["Signature"] = signature

	formData := url.Values{}
	for k, v := range params {
		formData.Set(k, v)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.PostForm(endpoint, formData)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	var res aliyunCaptchaResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return false, fmt.Errorf("解析阿里云响应失败: %w, 响应: %s", err, string(body))
	}

	if res.Code != "" && res.Code != "Success" {
		return false, fmt.Errorf("阿里云返回错误: %s (%s)", res.Message, res.Code)
	}

	return res.Result.VerifyResult, nil
}

func AliyunCaptchaCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		if common.AliyunCaptchaCheckEnabled {
			captchaVerifyParam := c.Query("aliyun_captcha")
			if captchaVerifyParam == "" {
				captchaVerifyParam = c.GetHeader("X-Aliyun-Captcha")
			}
			if captchaVerifyParam == "" && c.Request.Body != nil {
				// 尝试从 JSON Body 中读取
				bodyBytes, err := io.ReadAll(c.Request.Body)
				if err == nil {
					c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
					var bodyMap map[string]interface{}
					if json.Unmarshal(bodyBytes, &bodyMap) == nil {
						if val, ok := bodyMap["aliyun_captcha"].(string); ok {
							captchaVerifyParam = val
						}
					}
				}
			}

			if captchaVerifyParam == "" {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "阿里云验证码参数为空，请完成验证！",
				})
				c.Abort()
				return
			}

			ok, err := verifyAliyunCaptcha(
				captchaVerifyParam,
				common.AliyunCaptchaSceneId,
				common.AliyunCaptchaAccessKeyId,
				common.AliyunCaptchaAccessKeySecret,
				common.AliyunCaptchaRegion,
			)
			if err != nil {
				common.SysError(fmt.Sprintf("Aliyun Captcha verify error: %s", err.Error()))
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "阿里云验证码校验出错: " + err.Error(),
				})
				c.Abort()
				return
			}

			if !ok {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "阿里云验证码校验未通过，请重试！",
				})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

package controller

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"

	"github.com/gin-gonic/gin"
)

// 兑换码商店的抓取常量
const (
	shopUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
	shopCacheTTL  = 5 * time.Minute
	shopBodyLimit = 2 << 20
)

// ShopGood 是外部兑换码商店返回的商品条目（仅保留展示所需字段）
type ShopGood struct {
	Id            int    `json:"id"`
	Name          string `json:"name"`
	Price         string `json:"price"`
	Stock         int    `json:"stock"`
	StockStr      string `json:"stock_str"`
	Remark        string `json:"remark"`
	LimitQuantity int    `json:"limit_quantity"`
}

var (
	shopCateidPattern = regexp.MustCompile(`name="cateid"[^>]*value="([0-9]+)"`)
	shopHTMLTag       = regexp.MustCompile(`<[^>]*>`)

	shopCacheMutex sync.Mutex
	shopCacheGoods []ShopGood
	shopCacheTime  time.Time
)

// GetShopGoods 由服务端代取兑换码商店的商品列表。
//
// 背景：商店的商品列表不是页面自带的，而是页面加载后由 JS 请求
// /ajax/getgoodlistjson 拉取，且该接口强制依赖会话 Cookie。商店下发的
// Cookie 未声明 SameSite=None，浏览器按默认 SameSite=Lax 处理，跨站
// iframe 中的请求不会携带，导致内嵌页面商品区恒为空。这里改为服务端
// 维持会话直取数据，前端用自有样式渲染，彻底绕开该限制。
func GetShopGoods(c *gin.Context) {
	link := strings.TrimSpace(common.TopUpLink)
	if link == "" {
		common.ApiErrorMsg(c, "未配置兑换码商店链接")
		return
	}

	shopCacheMutex.Lock()
	if shopCacheGoods != nil && time.Since(shopCacheTime) < shopCacheTTL {
		cached := shopCacheGoods
		shopCacheMutex.Unlock()
		common.ApiSuccess(c, cached)
		return
	}
	shopCacheMutex.Unlock()

	goods, err := fetchShopGoods(link)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	shopCacheMutex.Lock()
	shopCacheGoods = goods
	shopCacheTime = time.Now()
	shopCacheMutex.Unlock()

	common.ApiSuccess(c, goods)
}

func fetchShopGoods(link string) ([]ShopGood, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{
		Jar:     jar,
		Timeout: 20 * time.Second,
	}

	// 第一步：访问商品页，建立会话并解析出当前分类 ID
	pageReq, err := http.NewRequest(http.MethodGet, link, nil)
	if err != nil {
		return nil, err
	}
	pageReq.Header.Set("User-Agent", shopUserAgent)

	pageResp, err := client.Do(pageReq)
	if err != nil {
		return nil, err
	}
	defer pageResp.Body.Close()

	pageBody, err := io.ReadAll(io.LimitReader(pageResp.Body, shopBodyLimit))
	if err != nil {
		return nil, err
	}
	if pageResp.StatusCode != http.StatusOK {
		return nil, errors.New("商店页面返回 " + pageResp.Status)
	}

	finalURL := pageResp.Request.URL
	cateid := "0"
	if match := shopCateidPattern.FindSubmatch(pageBody); len(match) > 1 {
		cateid = string(match[1])
	}

	// 第二步：带着会话请求商品列表接口
	form := url.Values{}
	form.Set("cateid", cateid)
	form.Set("keywords", "")
	form.Set("types", "category")

	listURL := *finalURL
	listURL.Path = "/ajax/getgoodlistjson"
	listURL.RawQuery = ""

	listReq, err := http.NewRequest(http.MethodPost, listURL.String(), strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	listReq.Header.Set("User-Agent", shopUserAgent)
	listReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	listReq.Header.Set("X-Requested-With", "XMLHttpRequest")
	listReq.Header.Set("Referer", finalURL.String())

	listResp, err := client.Do(listReq)
	if err != nil {
		return nil, err
	}
	defer listResp.Body.Close()

	listBody, err := io.ReadAll(io.LimitReader(listResp.Body, shopBodyLimit))
	if err != nil {
		return nil, err
	}
	if len(strings.TrimSpace(string(listBody))) == 0 {
		return nil, errors.New("商店未返回商品数据，请稍后重试")
	}

	var raw []struct {
		Id            int    `json:"id"`
		Name          string `json:"name"`
		Price         string `json:"price"`
		Kucun         int    `json:"kucun"`
		StockStr      string `json:"stockStr"`
		Remark        string `json:"remark"`
		LimitQuantity int    `json:"limit_quantity"`
	}
	if err := json.Unmarshal(listBody, &raw); err != nil {
		return nil, err
	}

	goods := make([]ShopGood, 0, len(raw))
	for _, item := range raw {
		remark := shopHTMLTag.ReplaceAllString(item.Remark, " ")
		remark = strings.Join(strings.Fields(remark), " ")
		goods = append(goods, ShopGood{
			Id:            item.Id,
			Name:          strings.TrimSpace(item.Name),
			Price:         item.Price,
			Stock:         item.Kucun,
			StockStr:      item.StockStr,
			Remark:        remark,
			LimitQuantity: item.LimitQuantity,
		})
	}
	return goods, nil
}

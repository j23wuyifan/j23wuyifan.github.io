 > 这是一篇示例题解，用于展示文章排版，可在写作区修改或删除。

## 问题

给定长度为 $n$ 的数组，有多次询问，每次求区间 $[l,r]$ 的元素和。

如果每次都暴力枚举，单次需要 $O(n)$。我们可以预先处理每个前缀的和。

## 推导

定义 $s_i = \sum_{j=1}^{i} a_j$，并设 $s_0=0$。

那么：

$$\sum_{i=l}^{r}a_i=s_r-s_{l-1}.$$

因为 $s_r$ 包含前 $r$ 项，减掉前 $l-1$ 项后，恰好剩下区间 $[l,r]$。

## C++17 实现

```cpp
#include<bits/stdc++.h>
#define int long long
using namespace std;
const int N = 2e5 + 10;
int n, q, s[N];
signed main()
{
    ios::sync_with_stdio(false);
    cin.tie(0);
    cin >> n >> q;
    for (int i = 1; i <= n; i ++)
    {
        cin >> s[i];
        s[i] += s[i - 1];
    }
    while (q --)
    {
        int l, r;
        cin >> l >> r;
        cout << s[r] - s[l - 1] << '\n';
    }
    return 0;
}
```

## 复杂度

预处理 $O(n)$，单次询问 $O(1)$，总时间 $O(n+q)$，空间 $O(n)$。
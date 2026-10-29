-- Pico: Top creators by total payment volume (USD-equivalent)

WITH creator_wallets AS (
    SELECT address FROM (
        VALUES
            (0x0000000000000000000000000000000000000000) -- placeholder: replace with real creator wallets
    ) AS t(address)
),
payments AS (
    SELECT
        t."to" AS creator,
        CASE
            WHEN t.contract_address = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C THEN CAST(value AS DOUBLE) / 1e6
            WHEN t.contract_address = 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A THEN CAST(value AS DOUBLE) / 100.0 * 0.001
            ELSE CAST(value AS DOUBLE) / 1e18
        END AS usd_approx,
        t."from" AS supporter
    FROM celo.erc20_celo.evt_Transfer t
    INNER JOIN creator_wallets cw ON t."to" = cw.address
    WHERE t.contract_address IN (
        0xcebA9300f2b948710d2653dD7B07f33A8B32118C,
        0x765DE816845861e75A25fCA122bb6898B8B1282a,
        0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73,
        0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787,
        0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A
    )
    AND evt_block_time >= NOW() - INTERVAL '90' DAY
)

SELECT
    creator,
    COUNT(*) AS total_payments,
    COUNT(DISTINCT supporter) AS unique_supporters,
    ROUND(SUM(usd_approx), 2) AS total_volume_usd
FROM payments
GROUP BY 1
ORDER BY total_volume_usd DESC
LIMIT 25


import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class ExecuteScreen extends StatelessWidget {
  const ExecuteScreen({super.key});
  @override
  Widget build(BuildContext context) {
    Future<void> open(String url) async {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) await launchUrl(uri);
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Execute', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text('Deep links to providers:'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            ElevatedButton(onPressed: () => open('https://www.raizinvest.com.au/'), child: const Text('Raiz')),
            ElevatedButton(onPressed: () => open('https://www.spaceship.com.au/'), child: const Text('Spaceship')),
            ElevatedButton(onPressed: () => open('https://www.commsec.com.au/'), child: const Text('CommSec Pocket')),
            ElevatedButton(onPressed: () => open('https://www.stockspot.com.au/'), child: const Text('Stockspot')),
            ElevatedButton(onPressed: () => open('https://www.quietgrowth.com.au/'), child: const Text('QuietGrowth')),
          ],
        ),
      ],
    );
  }
}
